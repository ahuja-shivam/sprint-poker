import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
    Spade, Clock, ArrowLeft, ChevronRight, Users, Hash,
    CheckCircle2, Circle, Play, Ticket, Crown, LogIn
} from 'lucide-react'

export default function History() {
    const { session } = useAuth()
    const navigate = useNavigate()
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [roomDetail, setRoomDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)

    // Redirect if not signed in
    if (!session) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
                        <LogIn className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
                    <p className="text-slate-400 text-sm mb-6">You need to sign in to view your room history.</p>
                    <button
                        onClick={() => navigate('/login?redirect=/history')}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
                    >
                        Sign In
                    </button>
                </div>
            </div>
        )
    }

    // Fetch all rooms created by this user
    useEffect(() => {
        const fetchRooms = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('rooms')
                .select('id, created_at, current_ticket_id, is_revealed')
                .eq('host_id', session.user.id)
                .order('created_at', { ascending: false })

            if (data) {
                // For each room, fetch ticket count and participant count
                const enriched = await Promise.all(
                    data.map(async (room) => {
                        const [ticketRes, participantRes] = await Promise.all([
                            supabase
                                .from('tickets')
                                .select('id, ticket_id, status, avg_score', { count: 'exact' })
                                .eq('room_id', room.id)
                                .order('position', { ascending: true }),
                            supabase
                                .from('participants')
                                .select('id', { count: 'exact' })
                                .eq('room_id', room.id),
                        ])

                        const tickets = ticketRes.data || []
                        const completedCount = tickets.filter(t => t.status === 'completed').length

                        return {
                            ...room,
                            ticketCount: tickets.length,
                            completedCount,
                            participantCount: participantRes.count || 0,
                            firstTicketId: tickets[0]?.ticket_id || null,
                            tickets,
                        }
                    })
                )
                setRooms(enriched)
            }
            setLoading(false)
        }

        fetchRooms()
    }, [session.user.id])

    // Fetch detailed room data when a room is selected
    const handleSelectRoom = async (room) => {
        if (selectedRoom === room.id) {
            setSelectedRoom(null)
            setRoomDetail(null)
            return
        }

        setSelectedRoom(room.id)
        setDetailLoading(true)

        // Fetch participants
        const { data: participants } = await supabase
            .from('participants')
            .select('*')
            .eq('room_id', room.id)

        // Fetch tickets with their votes
        const { data: tickets } = await supabase
            .from('tickets')
            .select('*')
            .eq('room_id', room.id)
            .order('position', { ascending: true })

        // Fetch all votes for this room
        const { data: votes } = await supabase
            .from('votes')
            .select('*')
            .eq('room_id', room.id)

        // Fetch host info
        const { data: roomData } = await supabase
            .from('rooms')
            .select('host_id, host_vote')
            .eq('id', room.id)
            .single()

        let hostName = session.user.name || session.user.email

        // Group votes by ticket
        const votesByTicket = {}
        if (votes) {
            votes.forEach(v => {
                if (!votesByTicket[v.ticket_id]) votesByTicket[v.ticket_id] = []
                votesByTicket[v.ticket_id].push(v)
            })
        }

        setRoomDetail({
            participants: participants || [],
            tickets: tickets || [],
            votesByTicket,
            hostName,
            hostVote: roomData?.host_vote,
        })
        setDetailLoading(false)
    }

    const formatDate = (dateStr) => {
        const d = new Date(dateStr)
        const now = new Date()
        const diff = now - d
        const mins = Math.floor(diff / 60000)
        const hours = Math.floor(diff / 3600000)
        const days = Math.floor(diff / 86400000)

        if (mins < 1) return 'Just now'
        if (mins < 60) return `${mins}m ago`
        if (hours < 24) return `${hours}h ago`
        if (days < 7) return `${days}d ago`
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Spade className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">Room History</h1>
                            <p className="text-xs text-slate-500">{rooms.length} room{rooms.length !== 1 ? 's' : ''} created</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 text-sm">Loading your rooms...</p>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-7 h-7 text-slate-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-2">No rooms yet</h2>
                        <p className="text-slate-400 text-sm mb-6">Create your first room to start estimating!</p>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
                        >
                            Create Room
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rooms.map((room) => (
                            <div key={room.id} className="group">
                                {/* Room Card */}
                                <button
                                    onClick={() => handleSelectRoom(room)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${selectedRoom === room.id
                                        ? 'bg-indigo-500/10 border-indigo-500/30'
                                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center shrink-0">
                                                <Spade className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-sm font-mono text-slate-300 truncate">
                                                        {room.firstTicketId
                                                            ? `${room.firstTicketId}${room.ticketCount > 1 ? ` + ${room.ticketCount - 1} more` : ''}`
                                                            : `Room ${room.id.slice(0, 8)}`
                                                        }
                                                    </span>
                                                    {room.completedCount === room.ticketCount && room.ticketCount > 0 && (
                                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">Done</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(room.created_at)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {room.participantCount}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Hash className="w-3 h-3" />
                                                        {room.completedCount}/{room.ticketCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-5 h-5 text-slate-600 transition-transform duration-200 ${selectedRoom === room.id ? 'rotate-90' : ''}`} />
                                    </div>
                                </button>

                                {/* Expanded Room Detail */}
                                {selectedRoom === room.id && (
                                    <div className="mt-2 ml-4 border-l-2 border-indigo-500/20 pl-4 py-2 space-y-4 animate-in">
                                        {detailLoading ? (
                                            <div className="py-6 text-center">
                                                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                <p className="text-xs text-slate-500">Loading details...</p>
                                            </div>
                                        ) : roomDetail && (
                                            <>
                                                {/* Participants */}
                                                <div>
                                                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5" />
                                                        Participants ({roomDetail.participants.length + 1})
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                                                            <Crown className="w-3 h-3" />
                                                            {roomDetail.hostName} (Host)
                                                        </span>
                                                        {roomDetail.participants.map(p => (
                                                            <span key={p.id} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300">
                                                                {p.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Tickets with votes */}
                                                <div>
                                                    <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <Ticket className="w-3.5 h-3.5" />
                                                        Tickets ({roomDetail.tickets.length})
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {roomDetail.tickets.map(ticket => {
                                                            const ticketVotes = roomDetail.votesByTicket[ticket.id] || []
                                                            const isCompleted = ticket.status === 'completed'
                                                            const isActive = ticket.status === 'active'

                                                            return (
                                                                <div
                                                                    key={ticket.id}
                                                                    className={`p-3 rounded-xl border ${isCompleted
                                                                        ? 'bg-emerald-500/5 border-emerald-500/15'
                                                                        : isActive
                                                                            ? 'bg-indigo-500/10 border-indigo-500/20'
                                                                            : 'bg-white/[0.02] border-white/10'
                                                                        }`}
                                                                >
                                                                    {/* Ticket header */}
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            {isCompleted ? (
                                                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                                            ) : isActive ? (
                                                                                <Play className="w-4 h-4 text-indigo-400" />
                                                                            ) : (
                                                                                <Circle className="w-4 h-4 text-slate-600" />
                                                                            )}
                                                                            <span className={`text-sm font-mono font-bold ${isCompleted ? 'text-emerald-300' : isActive ? 'text-indigo-300' : 'text-slate-400'}`}>
                                                                                {ticket.ticket_id}
                                                                            </span>
                                                                        </div>
                                                                        {ticket.avg_score !== null && ticket.avg_score !== undefined && (
                                                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                                                Avg: {ticket.avg_score}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {ticket.description && (
                                                                        <p className="text-xs text-slate-400 mb-2 leading-relaxed">{ticket.description}</p>
                                                                    )}

                                                                    {/* Vote breakdown */}
                                                                    {ticketVotes.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
                                                                            {ticketVotes.map(vote => {
                                                                                const participant = roomDetail.participants.find(p => p.id === vote.participant_id)
                                                                                return (
                                                                                    <span
                                                                                        key={vote.id}
                                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs"
                                                                                    >
                                                                                        <span className="text-slate-400">{participant?.name || 'Unknown'}</span>
                                                                                        <span className="font-bold text-indigo-300">{vote.value}</span>
                                                                                    </span>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {ticketVotes.length === 0 && isCompleted && (
                                                                        <p className="text-[10px] text-slate-600 mt-1">No individual votes recorded</p>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Open room button */}
                                                <button
                                                    onClick={() => navigate(`/room/${room.id}?host=true`)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-slate-300 hover:text-white hover:bg-white/20 transition-all text-sm"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                    Open Room
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
