import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { Spade, LogIn, UserPlus } from 'lucide-react'

export default function Login() {
    const [mode, setMode] = useState('signin') // 'signin' or 'signup'
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const redirect = searchParams.get('redirect')
    const { session, signIn, signUp } = useAuth()

    // If already logged in, redirect
    useEffect(() => {
        if (!session) return
        navigate('/', { replace: true })
    }, [session])

    const handleSignIn = async (e) => {
        e.preventDefault()
        setError('')
        if (!email.trim() || !password.trim()) return

        setLoading(true)
        const result = await signIn(email, password)
        if (result.error) {
            setError(typeof result.error === 'string' ? result.error : result.error.message || 'Invalid credentials')
        }
        setLoading(false)
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setError('')

        if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            setError('All fields are required')
            return
        }
        if (password.length < 4) {
            setError('Password must be at least 4 characters')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        const result = await signUp(name.trim(), email.trim(), password)
        if (result.error) {
            setError(typeof result.error === 'string' ? result.error : result.error.message || 'Sign up failed')
        }
        setLoading(false)
    }

    const toggleMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin')
        setError('')
        setName('')
        setPassword('')
        setConfirmPassword('')
    }

    const isSignUp = mode === 'signup'

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                        <Spade className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {isSignUp
                            ? 'Sign up to create and host rooms'
                            : redirect === 'create'
                                ? 'Sign in to create a room'
                                : 'Enter your credentials'}
                    </p>
                </div>

                <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Name field — sign up only */}
                    {isSignUp && (
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    )}

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus={!isSignUp}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />

                    {/* Confirm password — sign up only */}
                    {isSignUp && (
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    )}

                    <button
                        type="submit"
                        disabled={loading || !email.trim() || !password.trim() || (isSignUp && (!name.trim() || !confirmPassword.trim()))}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
                    >
                        {isSignUp ? (
                            <>
                                <UserPlus className="w-5 h-5" />
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                {loading ? 'Signing in...' : 'Sign In'}
                            </>
                        )}
                    </button>
                </form>

                {/* Toggle between Sign In / Sign Up */}
                <div className="mt-6 text-center">
                    <button
                        onClick={toggleMode}
                        className="text-sm text-slate-400 hover:text-indigo-400 transition-colors"
                    >
                        {isSignUp
                            ? 'Already have an account? Sign In'
                            : "Don't have an account? Sign Up"}
                    </button>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors block mx-auto"
                >
                    ← Back to Home
                </button>
            </div>
        </div>
    )
}
