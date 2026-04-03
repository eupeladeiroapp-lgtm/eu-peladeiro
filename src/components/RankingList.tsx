interface RankingEntry {
  id: string
  nome: string
  foto_url: string | null
  valor: number
  posicao?: number
}

interface RankingListProps {
  entries: RankingEntry[]
  unidade?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function MedalIcon({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-xl">🥇</span>
  if (pos === 2) return <span className="text-xl">🥈</span>
  if (pos === 3) return <span className="text-xl">🥉</span>
  return (
    <div className="w-7 h-7 flex items-center justify-center">
      <span className="text-sm font-bold text-gray-500">{pos}</span>
    </div>
  )
}

export default function RankingList({ entries, unidade = '' }: RankingListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-4xl mb-2">📊</p>
        <p className="font-medium">Nenhum dado ainda</p>
        <p className="text-sm">Jogue alguns jogos para aparecer aqui!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const pos = entry.posicao ?? index + 1
        const isTop3 = pos <= 3

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              isTop3 ? 'bg-verde-claro border border-verde-campo/20' : 'bg-white border border-gray-100'
            }`}
          >
            <div className="w-8 flex-shrink-0 flex items-center justify-center">
              <MedalIcon pos={pos} />
            </div>

            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow">
              {entry.foto_url ? (
                <img src={entry.foto_url} alt={entry.nome} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-verde-campo flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{getInitials(entry.nome)}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{entry.nome}</p>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className={`font-bold text-lg ${isTop3 ? 'text-verde-campo' : 'text-gray-700'}`}>
                {entry.valor}
              </p>
              {unidade && <p className="text-xs text-gray-500">{unidade}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
