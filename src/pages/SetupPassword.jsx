import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { Spade, UserPlus } from 'lucide-react'

export default function SetupPassword() {
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const email = searchParams.get('email') || ''
    const { session, createAndSignIn } = useAuth()

    // If already logged in, redirect
    useEffect(() => {
        if (session) {
            navigate('/', { replace: true })
        }
    }, [session])

    // If no email in params, redirect to login
    useEffect(() => {
        if (!email) {
            navigate('/login', { replace: true })
        }
    }, [email])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!name.trim()) {
            setError('Name is required')
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
        const result = await createAndSignIn(name.trim(), email, password)
        if (result.error) {
            setError(typeof result.error === 'string' ? result.error : result.error.message || 'Failed to create account')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                        <Spade className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Complete Your Account</h1>
                    <p className="text-slate-400 text-sm">
                        Set up your name and password for <span className="text-indigo-400 font-medium">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Email display (read-only) */}
                    <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm cursor-not-allowed">
                        {email}
                    </div>

                    <input
                        type="text"
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />

                    <button
                        type="submit"
                        disabled={loading || !name.trim() || !password.trim() || !confirmPassword.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
                    >
                        <UserPlus className="w-5 h-5" />
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <button
                    onClick={() => navigate('/login')}
                    className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors block mx-auto"
                >
                    ← Back to Login
                </button>
            </div>
        </div>
    )
}
