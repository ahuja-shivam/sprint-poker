import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/AuthContext'
import { Copy, Eye, RotateCcw, Check, Clock, Users, Spade, Crown, ChevronRight, Ticket, Hash, CheckCircle2, Circle, Play, ArrowLeft } from 'lucide-react'

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21]

export default function Room() {
    const { roomId } = useParams()
    const [searchParams] = useSearchParams()
    const { session } = useAuth()

    // Only allow host mode if the user is actually logged in
    const isHost = searchParams.get('host') === 'true' && !!session

    const [participants, setParticipants] = useState([])
    const [votes, setVotes] = useState({})
    const [myVote, setMyVote] = useState(null)
    const [isRevealed, setIsRevealed] = useState(false)
    const [myParticipantId, setMyParticipantId] = useState(null)
    const [copied, setCopied] = useState(false)
    const [guestName, setGuestName] = useState('')
    const [hasJoined, setHasJoined] = useState(false)
    const [hostName, setHostName] = useState('')
    const [tickets, setTickets] = useState([])
    const [currentTicketId, setCurrentTicketId] = useState(null)
    const [viewingTicketId, setViewingTicketId] = useState(null)
    const joinCalledRef = useRef(false)

    // Determine if we need a name prompt (guest flow)
    const needsName = !isHost && !sessionStorage.getItem('poker_guest_name') && !hasJoined

    // The ticket the user is currently viewing (defaults to active ticket)
    const activeViewTicketId = viewingTicketId || currentTicketId
    const isViewingActiveTicket = activeViewTicketId === currentTicketId
    const viewingTicket = tickets.find(t => t.id === activeViewTicketId)
    const isViewingCompleted = viewingTicket?.status === 'completed'

    // Helper: fetch votes for a specific ticket and update state
    const fetchVotesForTicket = async (ticketId) => {
        const { data: allVotes } = await supabase
            .from('votes')
            .select('*')
            .eq('room_id', roomId)
            .eq('ticket_id', ticketId)

        const voteMap = {}
        if (allVotes) {
            allVotes.forEach((v) => {
                voteMap[v.participant_id] = v.value
            })
            const mine = allVotes.find((v) => v.participant_id === myParticipantId)
            setMyVote(mine ? mine.value : null)
        } else {
            setMyVote(null)
        }

        // Fetch host vote from room (host_vote is per-active-ticket only)
        if (isViewingActiveTicket || ticketId === currentTicketId) {
            const { data: room } = await supabase
                .from('rooms')
                .select('host_vote')
                .eq('id', roomId)
                .single()
            if (room?.host_vote !== null && room?.host_vote !== undefined) {
                voteMap.host = room.host_vote
            }
        }

        setVotes(voteMap)
    }

    // Join the room
    useEffect(() => {
        if (needsName) return

        // Host doesn't join as participant — they just observe and control
        if (isHost) {
            setHasJoined(true)
            return
        }

        // Guard against React StrictMode double-mount
        if (joinCalledRef.current) {
            setHasJoined(true)
            return
        }
        joinCalledRef.current = true

        const name = sessionStorage.getItem('poker_guest_name') || 'Guest'
        const participantKey = `poker_participant_${roomId}`

        const joinRoom = async () => {
            const existingId = sessionStorage.getItem(participantKey)
            if (existingId) {
                const { data: existing } = await supabase
                    .from('participants')
                    .select('id')
                    .eq('id', existingId)
                    .single()
                if (existing) {
                    setMyParticipantId(existing.id)
                    setHasJoined(true)
                    return
                }
            }

            const { data, error } = await supabase
                .from('participants')
                .insert([{ room_id: roomId, name }])
                .select()
                .single()

            if (data) {
                setMyParticipantId(data.id)
                sessionStorage.setItem(participantKey, data.id)
            }
            setHasJoined(true)
        }

        joinRoom()
    }, [roomId, needsName, isHost])

    // Subscribe to real-time updates
    useEffect(() => {
        if (!hasJoined) return

        let initialFetchDone = false

        // Fetch initial state — each query is wrapped in try-catch so
        // a failure in one (e.g. host name lookup) doesn't block the rest
        const fetchState = async () => {
            let room = null
            try {
                const { data } = await supabase
                    .from('rooms')
                    .select('is_revealed, host_id, host_vote, current_ticket_id')
                    .eq('id', roomId)
                    .single()
                room = data
            } catch (e) { console.warn('fetchState: rooms query failed', e) }

            if (room) {
                setIsRevealed(room.is_revealed)
                setCurrentTicketId(room.current_ticket_id)
                // Fetch host name (best-effort — may fail due to RLS)
                try {
                    if (room.host_id) {
                        const { data: hostUser } = await supabase
                            .from('app_users')
                            .select('name')
                            .eq('id', room.host_id)
                            .single()
                        if (hostUser) setHostName(hostUser.name)
                    }
                } catch (e) { console.warn('fetchState: host name lookup failed', e) }
            }

            try {
                const { data: parts } = await supabase
                    .from('participants')
                    .select('*')
                    .eq('room_id', roomId)
                if (parts) setParticipants(parts)
            } catch (e) { console.warn('fetchState: participants query failed', e) }

            // Fetch votes for active ticket
            const ticketToView = room?.current_ticket_id
            if (ticketToView) {
                try {
                    // Try fetching votes filtered by ticket_id
                    let allVotes = null
                    const { data: filtered } = await supabase
                        .from('votes')
                        .select('*')
                        .eq('room_id', roomId)
                        .eq('ticket_id', ticketToView)
                    allVotes = filtered

                    // Fallback: if filtered returns null (column might not exist), fetch all
                    if (!allVotes) {
                        const { data: unfiltered } = await supabase
                            .from('votes')
                            .select('*')
                            .eq('room_id', roomId)
                        allVotes = unfiltered
                    }

                    const voteMap = {}
                    if (allVotes) {
                        allVotes.forEach((v) => {
                            voteMap[v.participant_id] = v.value
                        })
                        const mine = allVotes.find((v) => v.participant_id === myParticipantId)
                        if (mine) setMyVote(mine.value)
                    }
                    // Add host vote
                    if (room?.host_vote !== null && room?.host_vote !== undefined) {
                        voteMap.host = room.host_vote
                    }
                    setVotes(voteMap)
                } catch (e) { console.warn('fetchState: votes query failed', e) }
            }

            // Fetch tickets
            try {
                const { data: ticketData } = await supabase
                    .from('tickets')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('position', { ascending: true })
                if (ticketData) setTickets(ticketData)
            } catch (e) { console.warn('fetchState: tickets query failed', e) }

            initialFetchDone = true
        }

        // Call fetchState immediately (don't wait for subscription)
        fetchState()

        // Use unique channel name to avoid Supabase channel name collision on re-mount
        const channelName = `room-${roomId}-${Date.now()}`

        // Subscribe to changes
        const channel = supabase
            .channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                if (payload.new) {
                    const wasRevealed = payload.old?.is_revealed
                    const nowRevealed = payload.new.is_revealed
                    setIsRevealed(nowRevealed)

                    const oldTicketId = payload.old?.current_ticket_id
                    const newTicketId = payload.new.current_ticket_id
                    setCurrentTicketId(newTicketId)

                    // New round started (ticket changed or reveal → unrevealed): reset view to active ticket
                    // Note: only compare ticket IDs when oldTicketId is defined, since
                    // Supabase may omit unchanged fields from payload.old
                    const ticketActuallyChanged = oldTicketId && oldTicketId !== newTicketId
                    if ((wasRevealed && !nowRevealed) || ticketActuallyChanged) {
                        setViewingTicketId(null) // snap back to active ticket
                        setMyVote(null)
                        setVotes({})
                    }

                    // Sync host vote from DB
                    if (payload.new.host_vote !== null && payload.new.host_vote !== undefined) {
                        setVotes((prev) => ({ ...prev, host: payload.new.host_vote }))
                    } else {
                        setVotes((prev) => {
                            const copy = { ...prev }
                            delete copy.host
                            return copy
                        })
                    }
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` }, (payload) => {
                if (!initialFetchDone) return
                if (payload.eventType === 'INSERT') {
                    setParticipants((prev) => {
                        if (prev.some((p) => p.id === payload.new.id)) return prev
                        return [...prev, payload.new]
                    })
                } else if (payload.eventType === 'DELETE') {
                    setParticipants((prev) => prev.filter((p) => p.id !== payload.old.id))
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setVotes((prev) => {
                        return { ...prev, [payload.new.participant_id]: payload.new.value }
                    })
                } else if (payload.eventType === 'DELETE') {
                    setVotes((prev) => {
                        const copy = { ...prev }
                        delete copy[payload.old.participant_id]
                        return copy
                    })
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `room_id=eq.${roomId}` }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setTickets((prev) => {
                        if (prev.some(t => t.id === payload.new.id)) return prev
                        return [...prev, payload.new].sort((a, b) => a.position - b.position)
                    })
                } else if (payload.eventType === 'UPDATE') {
                    setTickets((prev) => prev.map(t => t.id === payload.new.id ? payload.new : t))
                } else if (payload.eventType === 'DELETE') {
                    setTickets((prev) => prev.filter(t => t.id !== payload.old.id))
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    fetchState()
                }
            })

        // Poll every 10s as a safety net (real-time should handle most updates)
        const pollInterval = setInterval(() => {
            fetchState()
        }, 10000)

        return () => {
            clearInterval(pollInterval)
            supabase.removeChannel(channel)
        }
    }, [roomId, hasJoined, myParticipantId])

    const handleVote = async (value) => {
        setMyVote(value)

        const targetTicketId = activeViewTicketId

        if (isHost) {
            const updatedVotes = { ...votes, host: value }
            setVotes(updatedVotes)
            await supabase
                .from('rooms')
                .update({ host_vote: value })
                .eq('id', roomId)

            // Recalculate average if already revealed or viewing completed ticket
            if ((isRevealed || isViewingCompleted) && targetTicketId) {
                const voteVals = Object.values(updatedVotes).filter(v => v !== null && v !== undefined)
                if (voteVals.length > 0) {
                    const avg = parseFloat((voteVals.reduce((a, b) => a + b, 0) / voteVals.length).toFixed(1))
                    await supabase.from('tickets').update({ avg_score: avg }).eq('id', targetTicketId)
                }
            }
            return
        }

        // Update local votes immediately so the card reflects the vote instantly
        const updatedVotes = { ...votes, [myParticipantId]: value }
        setVotes(updatedVotes)

        await supabase
            .from('votes')
            .upsert(
                { room_id: roomId, participant_id: myParticipantId, ticket_id: targetTicketId, value },
                { onConflict: 'room_id,ticket_id,participant_id' }
            )

        // Recalculate average if already revealed or viewing completed ticket
        if ((isRevealed || isViewingCompleted) && targetTicketId) {
            const updatedVotes = { ...votes, [myParticipantId]: value }
            const voteVals = Object.values(updatedVotes).filter(v => v !== null && v !== undefined)
            if (voteVals.length > 0) {
                const avg = parseFloat((voteVals.reduce((a, b) => a + b, 0) / voteVals.length).toFixed(1))
                await supabase.from('tickets').update({ avg_score: avg }).eq('id', targetTicketId)
            }
        }
    }

    const handleReveal = async () => {
        setIsRevealed(true)
        await supabase
            .from('rooms')
            .update({ is_revealed: true })
            .eq('id', roomId)

        // Calculate average and save to current ticket
        if (currentTicketId) {
            const voteVals = Object.values(votes).filter(v => v !== null && v !== undefined)
            if (voteVals.length > 0) {
                const avg = parseFloat((voteVals.reduce((a, b) => a + b, 0) / voteVals.length).toFixed(1))
                await supabase
                    .from('tickets')
                    .update({ avg_score: avg, status: 'completed' })
                    .eq('id', currentTicketId)
            }
        }
    }

    const handleNextTicket = async () => {
        // Find the next pending ticket
        const currentIndex = tickets.findIndex(t => t.id === currentTicketId)
        const nextTicket = tickets.find((t, i) => i > currentIndex && t.status === 'pending')

        if (!nextTicket) {
            // No more tickets — just reset for a free round
            await handleReset()
            return
        }

        // Update next ticket status to active
        await supabase
            .from('tickets')
            .update({ status: 'active' })
            .eq('id', nextTicket.id)

        // Reset the room for a new round (don't delete old votes — they're history now)
        setIsRevealed(false)
        setMyVote(null)
        setVotes({})
        setViewingTicketId(null)

        await supabase
            .from('rooms')
            .update({ is_revealed: false, host_vote: null, current_ticket_id: nextTicket.id })
            .eq('id', roomId)
    }

    const handleReset = async () => {
        setIsRevealed(false)
        setMyVote(null)
        setVotes({})
        setViewingTicketId(null)

        await supabase
            .from('rooms')
            .update({ is_revealed: false, host_vote: null })
            .eq('id', roomId)

        // Delete votes for the current active ticket only (reset = start fresh on same ticket)
        if (currentTicketId) {
            await supabase
                .from('votes')
                .delete()
                .eq('room_id', roomId)
                .eq('ticket_id', currentTicketId)
        }
    }

    // Navigate to a ticket (completed or active) in the sidebar
    const handleViewTicket = async (ticketId) => {
        if (ticketId === currentTicketId) {
            // Snap back to the live active ticket
            setViewingTicketId(null)
            await fetchVotesForTicket(ticketId)
            // Restore the room's current revealed state
            const { data: room } = await supabase
                .from('rooms')
                .select('is_revealed')
                .eq('id', roomId)
                .single()
            if (room) setIsRevealed(room.is_revealed)
            return
        }

        // View a different (completed) ticket
        setViewingTicketId(ticketId)
        await fetchVotesForTicket(ticketId)

        // Completed tickets are always "revealed"
        const ticket = tickets.find(t => t.id === ticketId)
        if (ticket?.status === 'completed') {
            setIsRevealed(true)
        }
    }

    const copyLink = () => {
        const joinUrl = `${window.location.origin}/join/${roomId}`
        navigator.clipboard.writeText(joinUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Handle guest name submission
    const handleGuestJoin = (e) => {
        e.preventDefault()
        if (!guestName.trim()) return
        sessionStorage.setItem('poker_guest_name', guestName.trim())
        setHasJoined(false)
        window.location.reload()
    }

    // ── Guest Name Prompt ──
    if (needsName) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
                            <Spade className="w-7 h-7 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Join the Room</h2>
                        <p className="text-slate-400 text-sm mt-1">Enter your name to join</p>
                    </div>
                    <form onSubmit={handleGuestJoin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Your name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            maxLength={20}
                            autoFocus
                            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center text-lg"
                        />
                        <button
                            type="submit"
                            disabled={!guestName.trim()}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
                        >
                            Join Room
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    // ── Build combined players list (host first, then participants) ──
    const hostEntry = hostName ? { id: 'host', name: hostName, isHost: true } : null
    const allPlayers = hostEntry ? [hostEntry, ...participants] : participants

    // ── Get current ticket info ──
    const displayTicket = viewingTicket
    const completedCount = tickets.filter(t => t.status === 'completed').length
    const hasMoreTickets = tickets.some((t, i) => {
        const curIdx = tickets.findIndex(tk => tk.id === currentTicketId)
        return i > curIdx && t.status === 'pending'
    })

    // ── Calculate average ──
    const voteValues = Object.values(votes).filter((v) => v !== null && v !== undefined)
    const average = voteValues.length > 0
        ? (voteValues.reduce((a, b) => a + b, 0) / voteValues.length).toFixed(1)
        : null

    // ── Main Room View ──
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 shrink-0">
                <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Spade className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white leading-tight">Planning Poker</h1>
                            <p className="text-[10px] text-slate-500 font-mono">{roomId.slice(0, 8)}...</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {tickets.length > 0 && (
                            <span className="text-xs text-slate-400 px-2 py-1 rounded-lg bg-white/5">
                                {completedCount}/{tickets.length} done
                            </span>
                        )}
                        {isHost && (
                            <button
                                onClick={copyLink}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-slate-300 hover:text-white hover:bg-white/20 transition-all text-xs font-medium"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? 'Copied!' : 'Invite Link'}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Participants Sidebar - Left */}
                <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-white/10 p-4 overflow-y-auto min-h-0">
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">
                            Players ({allPlayers.length})
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                        {allPlayers.map((p) => {
                            const hasVoted = votes[p.id] !== undefined
                            const pIsHost = p.isHost === true
                            return (
                                <div
                                    key={p.id}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${pIsHost
                                        ? 'bg-amber-500/10 border border-amber-500/20'
                                        : p.id === myParticipantId
                                            ? 'bg-indigo-500/10 border border-indigo-500/30'
                                            : 'bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${pIsHost
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : isRevealed && hasVoted
                                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                            : hasVoted
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-white/10 text-slate-500'
                                        }`}>
                                        {pIsHost ? <Crown className="w-4 h-4" /> : isRevealed && hasVoted ? votes[p.id] : hasVoted ? '✓' : '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {p.name}
                                            {pIsHost && <span className="text-amber-400 ml-1">· Host</span>}
                                            {!pIsHost && p.id === myParticipantId && <span className="text-indigo-400 ml-1">(You)</span>}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            {pIsHost ? 'Facilitator' : isRevealed ? (hasVoted ? `Voted ${votes[p.id]}` : 'No vote') : (hasVoted ? 'Voted' : 'Thinking...')}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </aside>

                {/* Center Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
                    {/* Back to active ticket button (when viewing a completed ticket) */}
                    {!isViewingActiveTicket && (
                        <button
                            onClick={() => handleViewTicket(currentTicketId)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-slate-300 hover:text-white hover:bg-white/20 transition-all text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to active ticket
                        </button>
                    )}

                    {/* Current/Viewed Ticket Banner */}
                    {displayTicket && (
                        <div className={`w-full max-w-lg px-4 py-3 rounded-xl ${isViewingActiveTicket
                            ? 'bg-indigo-500/10 border border-indigo-500/20'
                            : 'bg-amber-500/10 border border-amber-500/20'
                            }`}>
                            <div className="flex items-center gap-2 mb-1">
                                <Ticket className="w-4 h-4 text-indigo-400" />
                                <span className={`text-xs font-mono font-bold ${isViewingActiveTicket ? 'text-indigo-300' : 'text-amber-300'}`}>
                                    {displayTicket.ticket_id}
                                </span>
                                {!isViewingActiveTicket && (
                                    <span className="text-[10px] text-amber-400 uppercase tracking-wider ml-auto">Viewing history</span>
                                )}
                            </div>
                            {displayTicket.description && (
                                <p className="text-sm text-slate-300 leading-relaxed">{displayTicket.description}</p>
                            )}
                        </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-300">
                            {isRevealed || isViewingCompleted
                                ? `Results: Average is ${average || '—'}`
                                : `${voteValues.length} / ${allPlayers.length} voted`
                            }
                        </span>
                    </div>

                    {/* Cards Display */}
                    <div className="flex flex-wrap justify-center gap-3 max-w-lg">
                        {allPlayers.map((p) => {
                            const pIsHost = p.isHost === true
                            const hasVoted = votes[p.id] !== undefined
                            const voteValue = votes[p.id]
                            const showVote = isRevealed || isViewingCompleted
                            return (
                                <div key={p.id} className="flex flex-col items-center gap-2">
                                    <div className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-500 ${showVote && hasVoted
                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                                        : hasVoted
                                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-transparent shadow-lg shadow-emerald-500/20'
                                            : pIsHost
                                                ? 'bg-amber-500/10 border-2 border-dashed border-amber-500/30 text-amber-400'
                                                : 'bg-white/5 border-2 border-dashed border-white/20 text-transparent'
                                        }`}>
                                        {showVote && hasVoted ? voteValue : hasVoted ? '✓' : pIsHost ? <Crown className="w-5 h-5" /> : '?'}
                                    </div>
                                    <span className="text-xs text-slate-400 max-w-[60px] truncate">
                                        {p.name}
                                        {pIsHost ? ' (Host)' : p.id === myParticipantId ? ' (You)' : ''}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Host Controls — only show when viewing the active ticket */}
                    {isHost && isViewingActiveTicket && (
                        <div className="flex gap-3">
                            {!isRevealed ? (
                                <button
                                    onClick={handleReveal}
                                    disabled={voteValues.length === 0}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
                                >
                                    <Eye className="w-5 h-5" />
                                    Reveal Cards
                                </button>
                            ) : (
                                <>
                                    {hasMoreTickets ? (
                                        <button
                                            onClick={handleNextTicket}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                            Next Ticket
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleReset}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-slate-300 hover:text-white hover:bg-white/20 transition-all"
                                        >
                                            <RotateCcw className="w-5 h-5" />
                                            New Round
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Tickets Sidebar - Right */}
                {tickets.length > 0 && (
                    <aside className="lg:w-72 border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto min-h-0">
                        <div className="p-4">
                            <div className="flex items-center gap-2 text-slate-400 mb-3">
                                <Hash className="w-4 h-4" />
                                <span className="text-xs font-medium uppercase tracking-wider">
                                    Tickets ({completedCount}/{tickets.length})
                                </span>
                            </div>
                            <div className="space-y-1.5">
                                {tickets.map((ticket) => {
                                    const isActive = ticket.id === currentTicketId
                                    const isCompleted = ticket.status === 'completed'
                                    const isViewing = ticket.id === activeViewTicketId
                                    return (
                                        <div
                                            key={ticket.id}
                                            onClick={() => (isCompleted || isActive) ? handleViewTicket(ticket.id) : null}
                                            className={`p-3 rounded-xl transition-all ${(isCompleted || isActive) ? 'cursor-pointer' : ''} ${isViewing
                                                ? 'bg-indigo-500/15 border border-indigo-500/30 ring-1 ring-indigo-500/20'
                                                : isActive
                                                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                                                    : isCompleted
                                                        ? 'bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10'
                                                        : 'bg-white/[0.03] border border-transparent'
                                                }`}
                                        >
                                            <div className="flex items-start gap-2.5">
                                                <div className="mt-0.5 shrink-0">
                                                    {isCompleted ? (
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                    ) : isActive ? (
                                                        <Play className="w-4 h-4 text-indigo-400" />
                                                    ) : (
                                                        <Circle className="w-4 h-4 text-slate-600" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`text-xs font-mono font-bold ${isViewing ? 'text-indigo-300' : isActive ? 'text-indigo-300' : isCompleted ? 'text-emerald-300' : 'text-slate-400'}`}>
                                                            {ticket.ticket_id}
                                                        </span>
                                                        {isCompleted && ticket.avg_score !== null && (
                                                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                                {ticket.avg_score}
                                                            </span>
                                                        )}
                                                        {isActive && !isViewing && (
                                                            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-medium">Active</span>
                                                        )}
                                                        {isViewing && (
                                                            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-medium">Viewing</span>
                                                        )}
                                                    </div>
                                                    {ticket.description && (
                                                        <p className={`text-xs mt-0.5 leading-relaxed ${isViewing ? 'text-slate-300' : isActive ? 'text-slate-300' : isCompleted ? 'text-slate-500' : 'text-slate-500'}`}>
                                                            {ticket.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {/* Voting Hand - Fixed Bottom (always visible so participants can update after reveal) */}
            <div className="shrink-0 border-t border-white/10 bg-slate-950/80 backdrop-blur-sm safe-area-pb">
                <div className="mx-auto py-4 px-4">
                    <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider">
                        {isViewingCompleted && !isViewingActiveTicket
                            ? 'Update your estimate for this ticket'
                            : isRevealed
                                ? 'Change your estimate'
                                : 'Pick your estimate'
                        }
                    </p>
                    <div className="flex justify-center gap-2 flex-nowrap overflow-x-auto">
                        {FIBONACCI.map((num) => (
                            <button
                                key={num}
                                onClick={() => handleVote(num)}
                                className={`w-12 h-16 sm:w-14 sm:h-20 rounded-xl font-bold text-lg transition-all duration-200 shrink-0 ${myVote === num
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/40 scale-110 -translate-y-1'
                                    : 'bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20 hover:border-indigo-500/50 hover:text-white hover:-translate-y-1'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
