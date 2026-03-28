import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import Layout from '@/components/Layout'
import LoadingScreen from '@/components/LoadingScreen'
import SetupPage from '@/pages/SetupPage'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import ClientesPage from '@/pages/ClientesPage'
import ClienteDetailPage from '@/pages/ClienteDetailPage'
import OrcamentosPage from '@/pages/OrcamentosPage'
import ProdutosPage from '@/pages/ProdutosPage'
import KanbanPage from '@/pages/KanbanPage'
import RelatoriosPage from '@/pages/RelatoriosPage'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) {
    return <LoadingScreen />
  }
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupPage />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="kanban" element={<KanbanPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/:id" element={<ClienteDetailPage />} />
          <Route path="orcamentos" element={<OrcamentosPage />} />
          <Route path="produtos" element={<ProdutosPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
