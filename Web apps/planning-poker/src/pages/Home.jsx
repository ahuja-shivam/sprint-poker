import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Plus, Spade, ArrowRight, LogIn, LogOut, Shield } from 'lucide-react'

export default function Home() {
    const { session, isAdmin, signOut } = useAuth()
    const [joinCode, setJoinCode] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleCreateRoom = async () => {
        if (!session) {
            navigate('/login?redirect=create')
            return
        }

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('rooms')
                .insert([{ host_id: session.user.id }])
                .select()
                .single()

            if (error) throw error
            navigate(`/room/${data.id}?host=true`)
        } catch (err) {
            alert('Failed to create room: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleJoinRoom = (e) => {
        e.preventDefault()
        if (!joinCode.trim()) return
        let roomId = joinCode.trim()
        if (roomId.includes('/room/')) {
            roomId = roomId.split('/room/').pop().split('?')[0]
        } else if (roomId.includes('/join/')) {
            roomId = roomId.split('/join/').pop().split('?')[0]
        }
        navigate(`/room/${roomId}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Spade className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Planning Poker</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {session ? (
                            <>
                                <span className="text-sm text-slate-400 hidden sm:block">{session.user.name || session.user.email}</span>
                                {isAdmin && (
                                    <button
                                        onClick={() => navigate('/admin')}
                                        className="flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors px-3 py-2 rounded-lg hover:bg-amber-500/10"
                                    >
                                        <Shield className="w-4 h-4" />
                                        <span className="hidden sm:inline">Admin</span>
                                    </button>
                                )}
                                <button
                                    onClick={signOut}
                                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Sign Out</span>
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
                            >
                                <LogIn className="w-4 h-4" />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
                <div className="text-center mb-12">
                    <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
                        Estimate Together,<br />
                        <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Ship Faster</span>
                    </h2>
                    <p className="text-slate-400 text-lg max-w-md mx-auto">
                        Create a room, share the link, and start estimating stories with your team in real-time.
                    </p>
                </div>

                <div className="max-w-md mx-auto space-y-6">
                    {/* Create Room */}
                    <button
                        onClick={handleCreateRoom}
                        disabled={loading}
                        className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-[1px] shadow-2xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300"
                    >
                        <div className="relative flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 px-8 py-5 text-white font-semibold text-lg transition-all group-hover:from-indigo-500 group-hover:to-purple-600">
                            <Plus className="w-6 h-6" />
                            {loading ? 'Creating...' : 'Create New Room'}
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-slate-500 uppercase tracking-wider">or join a room</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Join Room */}
                    <form onSubmit={handleJoinRoom} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Paste invite link or room ID"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                        />
                        <button
                            type="submit"
                            disabled={!joinCode.trim()}
                            className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}
