import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

const isTesting = import.meta.env.VITE_TESTING === 'true'
const SESSION_KEY = 'poker_session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Restore session from localStorage
        const stored = localStorage.getItem(SESSION_KEY)
        if (stored) {
            setSession(JSON.parse(stored))
        }

        // In testing mode, auto-login as admin
        if (isTesting && !stored) {
            const testSession = {
                user: { id: '00000000-0000-0000-0000-000000000001', email: 'admin@poker.local', name: 'Admin', role: 'admin' },
                access_token: 'mock-token',
            }
            localStorage.setItem(SESSION_KEY, JSON.stringify(testSession))
            setSession(testSession)
        }

        setLoading(false)
    }, [])

    // Password-based sign in (against Supabase app_users table)
    const signIn = async (email, password) => {
        const { data, error } = await supabase
            .from('app_users')
            .select('id, name, email, role')
            .eq('email', email.toLowerCase())
            .eq('password', password)
            .single()

        if (error || !data) {
            return { error: 'Invalid email or password' }
        }

        const userSession = {
            user: { id: data.id, email: data.email, name: data.name, role: data.role },
            access_token: 'app-token',
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(userSession))
        setSession(userSession)
        return { error: null, session: userSession }
    }

    // Sign in by email only (for magic-link-verified users)
    const signInByEmail = async (email) => {
        const { data, error } = await supabase
            .from('app_users')
            .select('id, name, email, role')
            .eq('email', email.toLowerCase())
            .single()

        if (error || !data) {
            return { error: 'User not found', data: null }
        }

        const userSession = {
            user: { id: data.id, email: data.email, name: data.name, role: data.role },
            access_token: 'app-token',
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(userSession))
        setSession(userSession)
        return { error: null, session: userSession }
    }

    // Create a new user and auto sign-in (for magic link setup)
    const createAndSignIn = async (name, email, password) => {
        const { data, error } = await supabase
            .from('app_users')
            .insert([{ name, email: email.toLowerCase(), password, role: 'normal' }])
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return { error: 'A user with this email already exists' }
            }
            return { error: error.message }
        }

        const userSession = {
            user: { id: data.id, email: data.email, name: data.name, role: data.role },
            access_token: 'app-token',
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(userSession))
        setSession(userSession)
        return { error: null, session: userSession }
    }

    // Create a new user (admin only) — writes to Supabase
    const createUser = async (name, email, password, role = 'normal') => {
        const { data, error } = await supabase
            .from('app_users')
            .insert([{ name, email: email.toLowerCase(), password, role }])
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return { error: 'A user with this email already exists' }
            }
            return { error: error.message }
        }

        return { error: null, user: data }
    }

    // Self-registration: create account + auto sign-in
    const signUp = async (name, email, password) => {
        const createResult = await createUser(name, email, password, 'normal')
        if (createResult.error) {
            return { error: createResult.error }
        }
        // Auto sign-in after successful registration
        const signInResult = await signIn(email, password)
        return signInResult
    }

    // Delete a user (admin only)
    const deleteUser = async (userId) => {
        const { error } = await supabase
            .from('app_users')
            .delete()
            .eq('id', userId)

        return { error: error?.message || null }
    }

    // Get all users (admin only)
    const getUsers = async () => {
        const { data, error } = await supabase
            .from('app_users')
            .select('id, name, email, role, created_at')
            .order('created_at', { ascending: true })

        if (error) return []
        return data
    }

    const signOut = () => {
        localStorage.removeItem(SESSION_KEY)
        setSession(null)
        // Also sign out from Supabase Auth (clears magic link session)
        supabase.auth.signOut()
    }

    const isAdmin = session?.user?.role === 'admin'

    return (
        <AuthContext.Provider
            value={{
                session,
                loading,
                isAdmin,
                signIn,
                signInByEmail,
                signUp,
                createAndSignIn,
                signOut,
                createUser,
                deleteUser,
                getUsers,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
