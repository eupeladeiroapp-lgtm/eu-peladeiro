import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { user, loading, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-16 px-6"
      style={{ background: 'linear-gradient(160deg, #1D9E75 0%, #085041 100%)' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center shadow-2xl">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="26" stroke="white" strokeWidth="3" fill="none"/>
              {/* Soccer ball pattern */}
              <circle cx="28" cy="28" r="8" fill="white"/>
              <path d="M28 2 L28 10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M28 46 L28 54" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M2 28 L10 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M46 28 L54 28" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M7.6 7.6 L13.3 13.3" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M42.7 42.7 L48.4 48.4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M48.4 7.6 L42.7 13.3" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M13.3 42.7 L7.6 48.4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">Eu Peladeiro</h1>
            <p className="text-white/80 text-lg mt-2 font-medium">
              Organize sua pelada do jeito certo!
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="w-full space-y-3 mt-4">
          {[
            { emoji: '⚽', text: 'Gerencie jogos e confirme presença' },
            { emoji: '👥', text: 'Sorteio automático e justo de times' },
            { emoji: '📊', text: 'Rankings e estatísticas do grupo' },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3"
            >
              <span className="text-2xl">{item.emoji}</span>
              <p className="text-white/90 font-medium text-sm">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Sign in button */}
        <div className="w-full mt-6">
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 font-semibold text-base py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60"
          >
            {/* Google "G" icon */}
            <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.78h5.4a4.62 4.62 0 01-2 3.03v2.5h3.24c1.9-1.74 3-4.3 3-7.31z"
                fill="#4285F4"
              />
              <path
                d="M10 20c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H1.08v2.58A10 10 0 0010 20z"
                fill="#34A853"
              />
              <path
                d="M4.42 11.91A5.98 5.98 0 014.1 10c0-.66.11-1.3.32-1.91V5.51H1.08A10 10 0 000 10c0 1.62.39 3.14 1.08 4.49l3.34-2.58z"
                fill="#FBBC05"
              />
              <path
                d="M10 3.96c1.47 0 2.78.5 3.82 1.5l2.86-2.86C14.96.9 12.7 0 10 0A10 10 0 001.08 5.51l3.34 2.58C5.2 5.72 7.4 3.96 10 3.96z"
                fill="#EA4335"
              />
            </svg>
            {loading ? 'Entrando...' : 'Entrar com Google'}
          </button>
        </div>
      </div>

      <p className="text-white/50 text-xs text-center">
        Ao entrar, você concorda com nossos termos de uso.
      </p>
    </div>
  )
}
