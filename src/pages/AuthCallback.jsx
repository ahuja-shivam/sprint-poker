import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/AuthContext'
import { Spade, Loader2 } from 'lucide-react'

export default function AuthCallback() {
    const navigate = useNavigate()
    const { signInByEmail, signOut } = useAuth()
    const [status, setStatus] = useState('Verifying your email...')
    const [searchParams] = useSearchParams()
    const processed = useRef(false)

    useEffect(() => {
        if (processed.current) return
        processed.current = true

        // Clear any existing app session so the old user doesn't interfere
        signOut()

        // Handle PKCE flow: exchange the code from URL for a session
        const code = searchParams.get('code')
        if (code) {
            supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
                if (error) {
                    setStatus('Verification failed. Please try again.')
                    setTimeout(() => navigate('/login'), 2000)
                    return
                }
                if (data?.session) {
                    handleVerifiedUser(data.session.user.email)
                }
            })
            return
        }

        // Fallback: listen for auth state change (handles hash fragment flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session) {
                    handleVerifiedUser(session.user.email)
                }
            }
        )

        // Also check if session is already available (e.g. from hash auto-detection)
        const checkExistingSession = async () => {
            await new Promise(resolve => setTimeout(resolve, 1000))
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                handleVerifiedUser(session.user.email)
            }
        }
        checkExistingSession()

        return () => subscription.unsubscribe()
    }, [])

    const handleVerifiedUser = async (email) => {
        // Check if user already exists in app_users
        const result = await signInByEmail(email)

        if (result.error) {
            // New user — redirect to setup password
            navigate(`/setup-password?email=${encodeURIComponent(email)}`, { replace: true })
        } else {
            // Existing user — already signed in via signInByEmail
            setStatus('Signed in! Redirecting...')
            setTimeout(() => navigate('/', { replace: true }), 500)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/25">
                    <Spade className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                    <p className="text-white text-lg font-medium">{status}</p>
                </div>
                <p className="text-slate-500 text-sm">Please wait...</p>
            </div>
        </div>
    )
}
