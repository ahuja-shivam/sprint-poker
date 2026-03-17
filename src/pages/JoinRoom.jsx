import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UserCircle, Mail } from 'lucide-react'

export default function JoinRoom() {
    const { roomId } = useParams()
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')

    const handleJoin = (e) => {
        e.preventDefault()
        if (!name.trim() || !email.trim()) return
        // Store name and email in sessionStorage and navigate to room
        sessionStorage.setItem('poker_guest_name', name.trim())
        sessionStorage.setItem('poker_guest_email', email.trim().toLowerCase())
        navigate(`/room/${roomId}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                        <UserCircle className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Join Planning Poker</h1>
                    <p className="text-slate-400 text-sm">Enter your details to join the session</p>
                </div>

                <form onSubmit={handleJoin} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={20}
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                            type="email"
                            placeholder="Your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <p className="text-[11px] text-slate-500 -mt-2 px-1">Email is used to identify you if you rejoin the session</p>
                    <button
                        type="submit"
                        disabled={!name.trim() || !email.trim()}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
                    >
                        Join Room
                    </button>
                </form>
            </div>
        </div>
    )
}
