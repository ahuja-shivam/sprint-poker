import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { Spade, UserPlus, Trash2, Shield, User, ArrowLeft } from 'lucide-react'

export default function Admin() {
    const { session, isAdmin, getUsers, createUser, deleteUser } = useAuth()
    const navigate = useNavigate()

    const [users, setUsers] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'normal' })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loadingUsers, setLoadingUsers] = useState(true)

    // Redirect if not admin
    useEffect(() => {
        if (!session || !isAdmin) {
            navigate('/', { replace: true })
        }
    }, [session, isAdmin])

    useEffect(() => {
        refreshUsers()
    }, [])

    const refreshUsers = async () => {
        setLoadingUsers(true)
        const data = await getUsers()
        setUsers(data)
        setLoadingUsers(false)
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
            setError('All fields are required')
            return
        }

        if (form.password.length < 4) {
            setError('Password must be at least 4 characters')
            return
        }

        const result = await createUser(form.name.trim(), form.email.trim(), form.password, form.role)
        if (result.error) {
            setError(result.error)
        } else {
            setSuccess(`User "${form.name}" created successfully`)
            setForm({ name: '', email: '', password: '', role: 'normal' })
            setShowForm(false)
            refreshUsers()
        }
    }

    const handleDelete = async (userId, userName) => {
        if (userId === session.user.id) {
            setError("You can't delete yourself")
            return
        }
        if (!confirm(`Delete user "${userName}"?`)) return
        const result = await deleteUser(userId)
        if (result.error) {
            setError(result.error)
        } else {
            setSuccess(`User "${userName}" deleted`)
            refreshUsers()
        }
    }

    if (!session || !isAdmin) return null

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-sm bg-white/5">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <Spade className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">User Management</h1>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/10"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Messages */}
                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                        {success}
                    </div>
                )}

                {/* Create User Button */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">
                        All Users <span className="text-slate-500 font-normal">({users.length})</span>
                    </h2>
                    <button
                        onClick={() => { setShowForm(!showForm); setError(''); setSuccess('') }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
                    >
                        <UserPlus className="w-4 h-4" />
                        Create User
                    </button>
                </div>

                {/* Create User Form */}
                {showForm && (
                    <div className="mb-6 p-5 rounded-2xl bg-white/5 border border-white/10 animate-fade-in">
                        <h3 className="text-white font-semibold mb-4">New User</h3>
                        <form onSubmit={handleCreate} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                                />
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                    className="px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm appearance-none"
                                >
                                    <option value="normal" className="bg-slate-900">Normal User</option>
                                    <option value="admin" className="bg-slate-900">Admin</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Users List */}
                {loadingUsers ? (
                    <div className="text-center text-slate-500 py-12">Loading users...</div>
                ) : (
                    <div className="space-y-2">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin'
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-indigo-500/20 text-indigo-400'
                                        }`}>
                                        {user.role === 'admin'
                                            ? <Shield className="w-5 h-5" />
                                            : <User className="w-5 h-5" />
                                        }
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-medium text-sm">{user.name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === 'admin'
                                                    ? 'bg-amber-500/20 text-amber-400'
                                                    : 'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">{user.email}</span>
                                    </div>
                                </div>
                                {user.id !== session.user.id && (
                                    <button
                                        onClick={() => handleDelete(user.id, user.name)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
