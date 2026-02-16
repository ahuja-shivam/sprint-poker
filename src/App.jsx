import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './components/AuthContext'
import Home from './pages/Home'
import Room from './pages/Room'
import JoinRoom from './pages/JoinRoom'
import Login from './pages/Login'
import Admin from './pages/Admin'
import History from './pages/History'

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
          <Route path="/history" element={<History />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App