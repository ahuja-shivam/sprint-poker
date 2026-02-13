import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../components/AuthContext'
import { Copy, Eye, RotateCcw, Check, Clock, Users, Spade, Crown } from 'lucide-react'

const FIBONACCI = [0, 1, 2, 3, 5, 8, 13, 21]

export default function Room() {
    const { roomId } = useParams()
    const [searchParams] = useSearchParams()
    const isHost = searchParams.get('host') === 'true'
    const { session } = useAuth()

    const [participants, setParticipants] = useState([])
    const [votes, setVotes] = useState({})
    const [myVote, setMyVote] = useState(null)
    const [isRevealed, setIsRevealed] = useState(false)
    const [myParticipantId, setMyParticipantId] = useState(null)
    const [copied, setCopied] = useState(false)
    const [guestName, setGuestName] = useState('')
    const [hasJoined, setHasJoined] = useState(false)
    const [hostName, setHostName] = useState('')
    const joinCalledRef = useRef(false)

    // Determine if we need a name prompt (guest flow)
    const needsName = !isHost && !sessionStorage.getItem('poker_guest_name') && !hasJoined

    // Join the room
    useEffect(() => {
        if (needsName) return

        // Host doesn't join as participant — they just observe and control
        if (isHost) {
            setHasJoined(true)
            return
        }

        // Guard against React StrictMode double-mount
        if (joinCalledRef.current) return
        joinCalledRef.current = true

        const name = sessionStorage.getItem('poker_guest_name') || 'Guest'
        const participantKey = `poker_participant_${roomId}`

        const joinRoom = async () => {
            // Check if we already have a participant ID for this room
            const existingId = sessionStorage.getItem(participantKey)
            if (existingId) {
                const { data } = await supabase
                    .from('participants')
                    .select('id')
                    .eq('id', existingId)
                    .single()

                if (data) {
                    setMyParticipantId(existingId)
                    setHasJoined(true)
                    return
                }
                sessionStorage.removeItem(participantKey)
            }

            // Insert new participant
            const { data, error } = await supabase
                .from('participants')
                .insert([{ room_id: roomId, name }])
                .select()
                .single()

            if (error) {
                console.error('Failed to join:', error)
                return
            }

            sessionStorage.setItem(participantKey, data.id)
            setMyParticipantId(data.id)
            setHasJoined(true)
        }

        joinRoom()
    }, [roomId, isHost, needsName])

    // Subscribe to real-time updates
    useEffect(() => {
        if (!hasJoined) return

        let initialFetchDone = false

        // Fetch initial state
        const fetchState = async () => {
            const { data: room } = await supabase
                .from('rooms')
                .select('is_revealed, host_id, host_vote')
                .eq('id', roomId)
                .single()
            if (room) {
                setIsRevealed(room.is_revealed)
                // Fetch host name
                if (room.host_id) {
                    const { data: hostUser } = await supabase
                        .from('app_users')
                        .select('name')
                        .eq('id', room.host_id)
                        .single()
                    if (hostUser) setHostName(hostUser.name)
                }
            }

            const { data: parts } = await supabase
                .from('participants')
                .select('*')
                .eq('room_id', roomId)
            if (parts) setParticipants(parts)

            const { data: allVotes } = await supabase
                .from('votes')
                .select('*')
                .eq('room_id', roomId)

            // Build complete votes map (participants + host)
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

            initialFetchDone = true
        }

        // Subscribe to changes
        const channel = supabase
            .channel(`room-${roomId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
                if (payload.new) {
                    setIsRevealed(payload.new.is_revealed)
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
                if (!initialFetchDone) return // ignore events before initial fetch
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
                    setVotes((prev) => ({ ...prev, [payload.new.participant_id]: payload.new.value }))
                } else if (payload.eventType === 'DELETE') {
                    setVotes((prev) => {
                        const copy = { ...prev }
                        delete copy[payload.old.participant_id]
                        return copy
                    })
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    fetchState()
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId, hasJoined, myParticipantId])

    const handleVote = async (value) => {
        setMyVote(value)

        if (isHost) {
            setVotes((prev) => ({ ...prev, host: value }))
            await supabase
                .from('rooms')
                .update({ host_vote: value })
                .eq('id', roomId)
            return
        }

        await supabase
            .from('votes')
            .upsert(
                { room_id: roomId, participant_id: myParticipantId, value },
                { onConflict: 'room_id,participant_id' }
            )
    }

    const handleReveal = async () => {
        setIsRevealed(true)
        await supabase
            .from('rooms')
            .update({ is_revealed: true })
            .eq('id', roomId)
    }

    const handleReset = async () => {
        setIsRevealed(false)
        setMyVote(null)
        setVotes({})

        await supabase
            .from('rooms')
            .update({ is_revealed: false, host_vote: null })
            .eq('id', roomId)

        await supabase
            .from('votes')
            .delete()
            .eq('room_id', roomId)
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
        setHasJoined(false) // triggers the join useEffect
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
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
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
                {/* Participants Sidebar */}
                <aside className="lg:w-72 border-b lg:border-b-0 lg:border-r border-white/10 p-4 overflow-y-auto">
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
                    {/* Status */}
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-300">
                            {isRevealed
                                ? `Results: Average is ${average || '—'}`
                                : `${voteValues.length} / ${participants.length} voted`
                            }
                        </span>
                    </div>

                    {/* Cards Display */}
                    <div className="flex flex-wrap justify-center gap-3 max-w-lg">
                        {allPlayers.map((p) => {
                            const pIsHost = p.isHost === true
                            const hasVoted = votes[p.id] !== undefined
                            const voteValue = votes[p.id]
                            return (
                                <div key={p.id} className="flex flex-col items-center gap-2">
                                    <div className={`w-14 h-20 sm:w-16 sm:h-24 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-500 ${isRevealed && hasVoted
                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105'
                                        : hasVoted
                                            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-transparent shadow-lg shadow-emerald-500/20'
                                            : pIsHost
                                                ? 'bg-amber-500/10 border-2 border-dashed border-amber-500/30 text-amber-400'
                                                : 'bg-white/5 border-2 border-dashed border-white/20 text-transparent'
                                        }`}>
                                        {isRevealed && hasVoted ? voteValue : hasVoted ? '✓' : pIsHost ? <Crown className="w-5 h-5" /> : '?'}
                                    </div>
                                    <span className="text-xs text-slate-400 max-w-[60px] truncate">
                                        {p.name}
                                        {pIsHost ? ' (Host)' : p.id === myParticipantId ? ' (You)' : ''}
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Host Controls */}
                    {isHost && (
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
                                <button
                                    onClick={handleReset}
                                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-slate-300 hover:text-white hover:bg-white/20 transition-all"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    New Round
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Voting Hand - Fixed Bottom */}
            {!isRevealed && (
                <div className="shrink-0 border-t border-white/10 bg-slate-950/80 backdrop-blur-sm safe-area-pb">
                    <div className="max-w-lg mx-auto py-4 px-4">
                        <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider">Pick your estimate</p>
                        <div className="flex justify-center gap-2 flex-wrap">
                            {FIBONACCI.map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleVote(num)}
                                    className={`w-12 h-16 sm:w-14 sm:h-20 rounded-xl font-bold text-lg transition-all duration-200 ${myVote === num
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
            )}
        </div>
    )
}
