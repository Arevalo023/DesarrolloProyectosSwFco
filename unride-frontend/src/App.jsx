import { useState } from 'react'
import Login from './pages/Login'
import Register from './Pages/Register'

function App() {
  const [showRegister, setShowRegister] = useState(false)

  return showRegister ? (
    <Register onBackToLogin={() => setShowRegister(false)} />
  ) : (
    <Login onRegister={() => setShowRegister(true)} />
  )
}

export default App