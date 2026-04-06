import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import { isSupabaseConfigured } from './lib/supabase'

export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <div style={{ padding: '2rem', maxWidth: 480 }}>
        <h1>Admin EmbalaFlow</h1>
        <p className="muted">Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ficheiro .env desta app.</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
