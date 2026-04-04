import { ArrowLeft, Copy, Heart, Share2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const PIX_KEY = 'eupeladeiroapp@gmail.com'

export default function Sobre() {
  const navigate = useNavigate()
  const [pixCopiado, setPixCopiado] = useState(false)

  function handleCopiarPix() {
    navigator.clipboard.writeText(PIX_KEY).then(() => {
      setPixCopiado(true)
      setTimeout(() => setPixCopiado(false), 3000)
    })
  }

  async function handleCompartilhar() {
    const url = window.location.origin
    if (navigator.share) {
      await navigator.share({
        title: 'Eu Peladeiro',
        text: 'Organiza suas peladas com o Eu Peladeiro! Gratuito e fácil de usar 🙌⚽',
        url,
      })
    } else {
      navigator.clipboard.writeText(`Organiza suas peladas com o Eu Peladeiro! ${url}`)
      alert('Link copiado!')
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-gray-800 text-xl">Sobre o app</h1>
      </div>

      <div className="px-5 py-6">
        {/* Logo / Hero */}
        <div className="text-center mb-8">
          <div
            className="w-24 h-24 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1D9E75, #085041)' }}
          >
            <span className="text-5xl">⚽</span>
          </div>
          <h2 className="text-2xl font-black text-gray-800">Eu Peladeiro</h2>
          <p className="text-gray-400 text-sm mt-1">v1.0.0</p>
        </div>

        {/* O que é */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
          <h3 className="font-bold text-gray-800 text-lg mb-3">O que é isso aqui?</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            O <strong>Eu Peladeiro</strong> é um app feito pra galera que ama futebol, mas tá cansado
            de organizar pelada pelo WhatsApp! 😅
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mt-2">
            Com ele você cria grupos, marca jogos, confirma presença com um clique, sorteia os times
            de forma justa e acompanha as estatísticas de quem está mandando bem — ou mal — no campo. 🏆
          </p>
        </div>

        {/* Funcionalidades */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
          <h3 className="font-bold text-gray-800 text-lg mb-3">O que você pode fazer</h3>
          <div className="space-y-2">
            {[
              { emoji: '👥', text: 'Criar e gerenciar grupos de pelada' },
              { emoji: '📅', text: 'Marcar jogos e convidar galera' },
              { emoji: '✅', text: 'Confirmar presença em um toque' },
              { emoji: '🎲', text: 'Sortear times equilibrados automaticamente' },
              { emoji: '⚽', text: 'Acompanhar placar ao vivo' },
              { emoji: '📊', text: 'Ver rankings de gols, assistências e muito mais' },
              { emoji: '🏅', text: 'Construir seu histórico de peladeiro' },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{emoji}</span>
                <p className="text-gray-600 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Apoiar */}
        <div className="bg-verde-claro rounded-xl border border-verde-campo/20 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={18} className="text-red-500" />
            <h3 className="font-bold text-verde-escuro text-lg">Gostou? Apoia aí!</h3>
          </div>
          <p className="text-verde-escuro/80 text-sm leading-relaxed mb-4">
            O app é 100% gratuito e feito com muito amor pela galera da bola. Se quiser apoiar
            o projeto e ajudar a manter o servidor no ar, pode mandar um PIX! Qualquer valor
            é bem-vindo e muito obrigado! 🙏
          </p>

          {/* PIX Box */}
          <div className="bg-white rounded-lg border border-verde-campo/30 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Chave PIX
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-gray-700 break-all">{PIX_KEY}</code>
              <button
                onClick={handleCopiarPix}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  pixCopiado
                    ? 'bg-verde-campo text-white'
                    : 'bg-verde-claro text-verde-campo hover:bg-verde-campo hover:text-white'
                }`}
              >
                <Copy size={14} />
                {pixCopiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Compartilhar */}
        <button
          onClick={handleCompartilhar}
          className="w-full flex items-center justify-center gap-2 bg-verde-campo text-white font-bold py-4 rounded-xl hover:bg-verde-escuro transition-colors mb-6"
        >
          <Share2 size={18} />
          Compartilhar o app com amigos
        </button>

        {/* Links legais */}
        <div className="flex justify-center gap-4 mb-4 text-xs">
          <button
            onClick={() => navigate('/privacidade')}
            className="text-verde-campo underline underline-offset-2"
          >
            Política de Privacidade
          </button>
          <span className="text-gray-300">·</span>
          <button
            onClick={() => navigate('/termos')}
            className="text-verde-campo underline underline-offset-2"
          >
            Termos de Serviço
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm">
          <p>Feito com ❤️ para a galera da pelada</p>
          <p className="mt-1 text-xs">
            Eu Peladeiro v1.0.0 · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </Layout>
  )
}
