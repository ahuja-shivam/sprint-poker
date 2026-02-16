import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')

    const handleLogin = async (event) => {
        event.preventDefault()

        setLoading(true)
        const { error } = await supabase.auth.signInWithOtp({ email })

        if (error) {
            alert(error.error_description || error.message)
        } else {
            alert('Check your email for the login link!')
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-4">Planning Poker Login</h1>
            <p className="mb-4">Sign in via magic link with your email below</p>
            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-80">
                <input
                    className="p-2 rounded text-black"
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <button
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
                    disabled={loading}
                >
                    {loading ? <span>Loading</span> : <span>Send magic link</span>}
                </button>
            </form>
        </div>
    )
}
