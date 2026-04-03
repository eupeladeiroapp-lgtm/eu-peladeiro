interface CampoFutebolProps {
  selected: Record<string, 'principal' | 'secundaria'>
  onToggle: (pos: string) => void
}

interface PosicaoConfig {
  id: string
  label: string
  x: number
  y: number
}

const POSICOES: PosicaoConfig[] = [
  // Ataque
  { id: 'PE', label: 'PE', x: 20, y: 12 },
  { id: 'CA', label: 'CA', x: 50, y: 12 },
  { id: 'PD', label: 'PD', x: 80, y: 12 },
  // Meio
  { id: 'ME', label: 'ME', x: 20, y: 30 },
  { id: 'MC', label: 'MC', x: 50, y: 30 },
  { id: 'MD', label: 'MD', x: 80, y: 30 },
  // Meia-defensiva
  { id: 'VE', label: 'VE', x: 30, y: 50 },
  { id: 'VD', label: 'VD', x: 70, y: 50 },
  // Defesa
  { id: 'LE', label: 'LE', x: 15, y: 68 },
  { id: 'ZE', label: 'ZE', x: 38, y: 68 },
  { id: 'ZD', label: 'ZD', x: 62, y: 68 },
  { id: 'LD', label: 'LD', x: 85, y: 68 },
  // Gol
  { id: 'GOL', label: 'GOL', x: 50, y: 86 },
]

export default function CampoFutebol({ selected, onToggle }: CampoFutebolProps) {
  function getCircleStyle(posId: string) {
    const state = selected[posId]
    if (state === 'principal') {
      return {
        fill: '#1D9E75',
        stroke: '#FFD700',
        strokeWidth: 3,
      }
    }
    if (state === 'secundaria') {
      return {
        fill: '#1D9E75',
        stroke: '#1D9E75',
        strokeWidth: 2,
      }
    }
    return {
      fill: 'rgba(255,255,255,0.3)',
      stroke: 'rgba(255,255,255,0.8)',
      strokeWidth: 2,
    }
  }

  function getTextStyle(posId: string) {
    const state = selected[posId]
    if (state === 'principal' || state === 'secundaria') {
      return '#ffffff'
    }
    return 'rgba(255,255,255,0.9)'
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <svg
        viewBox="0 0 200 300"
        className="w-full h-auto"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
      >
        {/* Campo */}
        <rect x="2" y="2" width="196" height="296" rx="8" fill="#2d8a4e" stroke="#1a6b38" strokeWidth="2" />

        {/* Linhas do campo */}
        {/* Borda interna */}
        <rect x="10" y="10" width="180" height="280" rx="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Linha do meio */}
        <line x1="10" y1="150" x2="190" y2="150" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

        {/* Círculo central */}
        <circle cx="100" cy="150" r="25" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx="100" cy="150" r="2" fill="rgba(255,255,255,0.5)" />

        {/* Área grande de ataque (top) */}
        <rect x="35" y="10" width="130" height="50" rx="2" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

        {/* Área pequena de ataque */}
        <rect x="65" y="10" width="70" height="22" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* Área grande de defesa (bottom) */}
        <rect x="35" y="240" width="130" height="50" rx="2" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />

        {/* Área pequena de defesa */}
        <rect x="65" y="268" width="70" height="22" rx="2" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

        {/* Posições */}
        {POSICOES.map((pos) => {
          const cx = (pos.x / 100) * 196 + 2
          const cy = (pos.y / 100) * 296 + 2
          const style = getCircleStyle(pos.id)
          const textColor = getTextStyle(pos.id)
          const isPrincipal = selected[pos.id] === 'principal'

          return (
            <g
              key={pos.id}
              onClick={() => onToggle(pos.id)}
              className="cursor-pointer"
              style={{ userSelect: 'none' }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={pos.id === 'GOL' ? 14 : 12}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={pos.id === 'GOL' ? 7 : 8}
                fontWeight="700"
                fill={textColor}
                style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}
              >
                {pos.label}
              </text>
              {isPrincipal && (
                <text
                  x={cx + (pos.id === 'GOL' ? 12 : 10)}
                  y={cy - (pos.id === 'GOL' ? 10 : 8)}
                  fontSize="10"
                  fill="#FFD700"
                  style={{ pointerEvents: 'none' }}
                >
                  ★
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200" />
          <span>Não selecionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-verde-campo" />
          <span>Secundária</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-verde-campo border-2 border-dourado" />
          <span>Principal ★</span>
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 mt-1">
        Toque 1x = secundária · Toque 2x = principal · Toque 3x = limpar
      </p>
    </div>
  )
}
