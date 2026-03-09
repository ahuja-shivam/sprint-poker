import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import Home from './pages/Home'
import Room from './pages/Room'
import JoinRoom from './pages/JoinRoom'
import Login from './pages/Login'
import Admin from './pages/Admin'
import AuthCallback from './pages/AuthCallback'
import SetupPassword from './pages/SetupPassword'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/join/:roomId" element={<JoinRoom />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/setup-password" element={<SetupPassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
