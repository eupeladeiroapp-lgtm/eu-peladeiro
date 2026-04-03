interface AvatarStackProps {
  avatars: (string | null)[]
  names: string[]
  max?: number
  size?: 'sm' | 'md'
}

export default function AvatarStack({ avatars, names, max = 5, size = 'sm' }: AvatarStackProps) {
  const shown = avatars.slice(0, max)
  const extra = avatars.length - max

  const sizeClass = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  function getColor(index: number) {
    const colors = [
      'bg-verde-campo',
      'bg-blue-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="flex items-center">
      {shown.map((avatar, i) => (
        <div
          key={i}
          className={`${sizeClass} rounded-full border-2 border-white overflow-hidden flex items-center justify-center font-semibold text-white ${!avatar ? getColor(i) : ''}`}
          style={{ marginLeft: i > 0 ? '-8px' : 0, zIndex: shown.length - i }}
          title={names[i] || ''}
        >
          {avatar ? (
            <img src={avatar} alt={names[i] || ''} className="w-full h-full object-cover" />
          ) : (
            <span>{getInitials(names[i] || '?')}</span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div
          className={`${sizeClass} rounded-full border-2 border-white bg-gray-400 flex items-center justify-center font-semibold text-white`}
          style={{ marginLeft: '-8px', zIndex: 0 }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}
