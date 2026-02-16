import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Plus, Spade, ArrowRight, LogIn, LogOut, Shield, Trash2, Upload, Clock } from 'lucide-react'

export default function Home() {
    const { session, isAdmin, signOut } = useAuth()
    const [joinCode, setJoinCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [showTicketForm, setShowTicketForm] = useState(false)
    const [tickets, setTickets] = useState([{ ticketId: '', description: '' }])
    const [bulkInput, setBulkInput] = useState('')
    const navigate = useNavigate()

    const handleCreateRoom = () => {
        if (!session) {
            navigate('/login?redirect=create')
            return
        }
        setShowTicketForm(true)
    }

    const handleAddTicket = () => {
        setTickets([...tickets, { ticketId: '', description: '' }])
    }

    const handleRemoveTicket = (index) => {
        setTickets(tickets.filter((_, i) => i !== index))
    }

    const handleTicketChange = (index, field, value) => {
        const updated = [...tickets]
        updated[index][field] = value
        setTickets(updated)
    }

    const handleBulkPaste = () => {
        if (!bulkInput.trim()) return
        const lines = bulkInput.trim().split('\n').filter(line => line.trim())
        const parsed = lines.map(line => {
            // Split on tab first, then fallback to first whitespace group
            const tabParts = line.split('\t')
            if (tabParts.length >= 2) {
                return { ticketId: tabParts[0].trim(), description: tabParts.slice(1).join(' ').trim() }
            }
            // Fallback: first token is ID, rest is description
            const match = line.match(/^(\S+)\s+(.+)$/)
            if (match) {
                return { ticketId: match[1], description: match[2].trim() }
            }
            return { ticketId: line.trim(), description: '' }
        })
        setTickets(parsed)
        setBulkInput('')
    }

    const handleSubmitRoom = async () => {
        const validTickets = tickets.filter(t => t.ticketId.trim())
        if (validTickets.length === 0) {
            alert('Please add at least one ticket')
            return
        }

        setLoading(true)
        try {
            // Create room
            const { data: room, error: roomErr } = await supabase
                .from('rooms')
                .insert([{ host_id: session.user.id }])
                .select()
                .single()
            if (roomErr) throw roomErr

            // Insert tickets
            const ticketRows = validTickets.map((t, i) => ({
                room_id: room.id,
                ticket_id: t.ticketId.trim(),
                description: t.description.trim() || null,
                position: i,
                status: i === 0 ? 'active' : 'pending',
            }))

            const { data: insertedTickets, error: ticketErr } = await supabase
                .from('tickets')
                .insert(ticketRows)
                .select()

            if (ticketErr) throw ticketErr

            // Set current_ticket_id to the first ticket
            const firstTicket = insertedTickets.find(t => t.position === 0)
            if (firstTicket) {
                await supabase
                    .from('rooms')
                    .update({ current_ticket_id: firstTicket.id })
                    .eq('id', room.id)
            }

            navigate(`/room/${room.id}?host=true`)
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
                                <button
                                    onClick={() => navigate('/history')}
                                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                                >
                                    <Clock className="w-4 h-4" />
                                    <span className="hidden sm:inline">History</span>
                                </button>
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

                {!showTicketForm ? (
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
                ) : (
                    /* Ticket Input Form */
                    <div className="max-w-2xl mx-auto">
                        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                            <h3 className="text-lg font-semibold text-white mb-1">Add Tickets to Estimate</h3>
                            <p className="text-sm text-slate-400 mb-5">Enter ticket IDs and descriptions for each round of estimation.</p>

                            {/* Bulk paste area */}
                            <div className="mb-5">
                                <label className="text-xs text-slate-500 uppercase tracking-wider mb-2 block">Paste from JIRA / Spreadsheet</label>
                                <textarea
                                    value={bulkInput}
                                    onChange={(e) => setBulkInput(e.target.value)}
                                    placeholder={"CPX-5973\tSupport multiple bank accounts\nCPX-5982\tExpand Custom PIF Field Limit\nCPX-6018\tSalesforce and CPX Sync Error"}
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-mono resize-none"
                                />
                                <button
                                    onClick={handleBulkPaste}
                                    disabled={!bulkInput.trim()}
                                    className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Parse & Import
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px flex-1 bg-white/10" />
                                <span className="text-xs text-slate-500 uppercase tracking-wider">or add manually</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>

                            {/* Individual ticket rows */}
                            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-1">
                                {tickets.map((ticket, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs text-slate-600 w-5 text-right shrink-0">{i + 1}</span>
                                        <input
                                            type="text"
                                            placeholder="Ticket ID"
                                            value={ticket.ticketId}
                                            onChange={(e) => handleTicketChange(i, 'ticketId', e.target.value)}
                                            className="w-32 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Description"
                                            value={ticket.description}
                                            onChange={(e) => handleTicketChange(i, 'description', e.target.value)}
                                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                        />
                                        {tickets.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveTicket(i)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleAddTicket}
                                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
                            >
                                <Plus className="w-4 h-4" />
                                Add Ticket
                            </button>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowTicketForm(false); setTickets([{ ticketId: '', description: '' }]) }}
                                    className="px-5 py-3 rounded-xl bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 hover:text-white transition-all text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitRoom}
                                    disabled={loading || tickets.every(t => !t.ticketId.trim())}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25 text-sm"
                                >
                                    {loading ? 'Creating Room...' : `Create Room with ${tickets.filter(t => t.ticketId.trim()).length} Ticket${tickets.filter(t => t.ticketId.trim()).length !== 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
