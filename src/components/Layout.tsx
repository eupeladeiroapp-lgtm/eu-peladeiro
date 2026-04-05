import { ReactNode } from 'react'
import BottomNav from './BottomNav'

interface LayoutProps {
  children: ReactNode
  hideNav?: boolean
}

export default function Layout({ children, hideNav = false }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className={`max-w-lg mx-auto ${hideNav ? '' : 'pb-28'}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
