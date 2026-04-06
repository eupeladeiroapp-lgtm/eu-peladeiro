import { Calendar, Check, MapPin, Users, X } from 'lucide-react'
import { Jogo } from '../types'
import AvatarStack from './AvatarStack'

interface CardJogoProps {
  jogo: Jogo
  groupName?: string
  confirmados: number
  totalVagas: number
  avatars?: (string | null)[]
  nomes?: string[]
  userStatus?: 'confirmado' | 'recusado' | null
  onConfirmar?: () => void
  onRecusar?: () => void
  onClick?: () => void
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  aberto: { label: 'Aberto', className: 'bg-verde-claro text-verde-campo' },
  em_andamento: { label: 'Ao vivo', className: 'bg-red-100 text-red-600' },
  encerrado: { label: 'Encerrado', className: 'bg-gray-100 text-gray-500' },
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function CardJogo({
  jogo,
  groupName,
  confirmados,
  totalVagas,
  avatars = [],
  nomes = [],
  userStatus,
  onConfirmar,
  onRecusar,
  onClick,
}: CardJogoProps) {
  const statusInfo = STATUS_LABELS[jogo.status] || STATUS_LABELS.aberto

  return (
    <div
      className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 animate-fade-in cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          {groupName && (
            <p className="text-xs text-gray-500 font-medium mb-1 uppercase tracking-wide">
              {groupName}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
            <span className="text-xs text-gray-500">{jogo.formato}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-verde-campo">{formatTime(jogo.data_hora)}</p>
          <p className="text-xs text-gray-500">{formatDate(jogo.data_hora)}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        {jogo.local && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} className="text-verde-campo" />
            <span className="truncate max-w-[160px]">{jogo.local}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Calendar size={12} className="text-verde-campo" />
          <span>{formatDate(jogo.data_hora)}</span>
        </div>
      </div>

      {totalVagas > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users size={11} className="text-verde-campo" />
              <span><span className="font-bold text-verde-campo">{confirmados}</span>/{totalVagas} confirmados</span>
            </div>
            <span className="text-xs text-gray-400">{Math.round((confirmados / totalVagas) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-verde-campo rounded-full transition-all duration-500"
              style={{ width: `${Math.min((confirmados / totalVagas) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {avatars.length > 0 && (
            <AvatarStack avatars={avatars} names={nomes} max={5} size="sm" />
          )}
        </div>

        {jogo.status === 'aberto' && (onConfirmar || onRecusar) && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {userStatus !== 'confirmado' ? (
              <button
                onClick={onConfirmar}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-verde-campo text-white rounded-full hover:bg-verde-escuro transition-colors"
              >
                <Check size={12} />
                Confirmar
              </button>
            ) : (
              <button
                onClick={onRecusar}
                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors"
              >
                <X size={12} />
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
