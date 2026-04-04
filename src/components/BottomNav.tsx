import { Bell, Home, User, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Início', exact: true },
  { to: '/grupos', icon: Users, label: 'Grupos', exact: false },
  { to: '/convites', icon: Bell, label: 'Notificações', exact: false },
  { to: '/perfil', icon: User, label: 'Perfil', exact: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-stretch max-w-lg mx-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                isActive ? 'text-verde-campo' : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-verde-claro' : ''}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
