import { X } from 'lucide-react'

interface Props {
  titulo: string
  descricao: string
  onFechar: () => void
}

export default function ModalUpgradePro({ titulo, descricao, onFechar }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-t-2xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <h2 className="text-xl font-bold text-gray-800">Eu Peladeiro Pro</h2>
          </div>
          <button
            onClick={onFechar}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-gradient-to-r from-verde-campo to-verde-escuro rounded-xl p-4 mb-5 text-white">
          <p className="font-bold text-lg mb-1">{titulo}</p>
          <p className="text-white/80 text-sm">{descricao}</p>
        </div>

        <div className="space-y-2 mb-6">
          {[
            'Grupos ilimitados',
            'Até 25 membros por grupo',
            'Avaliações ilimitadas por mês',
            'Badge Pro no perfil',
            'Ranking global',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-verde-campo font-bold">✓</span>
              {item}
            </div>
          ))}
        </div>

        <button
          onClick={onFechar}
          className="w-full bg-gradient-to-r from-verde-campo to-verde-escuro text-white font-bold py-4 rounded-xl text-base"
        >
          Em breve — fique ligado! 🚀
        </button>
        <button
          onClick={onFechar}
          className="w-full mt-2 text-gray-400 text-sm py-2"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
