import React from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'

import Login from './pages/Login'
import GrupoConvite from './pages/GrupoConvite'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Grupos from './pages/Grupos'
import GrupoDetalhe from './pages/GrupoDetalhe'
import JogoConvite from './pages/JogoConvite'
import JogoTimes from './pages/JogoTimes'
import JogoAoVivo from './pages/JogoAoVivo'
import JogoRegistro from './pages/JogoRegistro'
import Rankings from './pages/Rankings'
import Perfil from './pages/Perfil'
import Convites from './pages/Convites'
import Sobre from './pages/Sobre'
import AvaliacaoHabilidades from './pages/AvaliacaoHabilidades'
import PoliticaPrivacidade from './pages/PoliticaPrivacidade'
import TermosServico from './pages/TermosServico'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1D9E75' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold text-lg">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/privacidade" element={<PoliticaPrivacidade />} />
      <Route path="/termos" element={<TermosServico />} />
      <Route path="/jogo/:token" element={<JogoConvite />} />
      <Route path="/grupo/convite/:id" element={<GrupoConvite />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grupos"
        element={
          <ProtectedRoute>
            <Grupos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grupos/:id"
        element={
          <ProtectedRoute>
            <GrupoDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jogo/:id/times"
        element={
          <ProtectedRoute>
            <JogoTimes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jogo/:id/ao-vivo"
        element={
          <ProtectedRoute>
            <JogoAoVivo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jogo/:id/registro"
        element={
          <ProtectedRoute>
            <JogoRegistro />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grupo/:id/rankings"
        element={
          <ProtectedRoute>
            <Rankings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />
      <Route
        path="/convites"
        element={
          <ProtectedRoute>
            <Convites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sobre"
        element={
          <ProtectedRoute>
            <Sobre />
          </ProtectedRoute>
        }
      />
      <Route
        path="/grupo/:id/avaliar"
        element={
          <ProtectedRoute>
            <AvaliacaoHabilidades />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontWeight: 600, fontSize: '14px' },
            success: { style: { background: '#1D9E75', color: '#fff' } },
            error: { style: { background: '#EF4444', color: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
