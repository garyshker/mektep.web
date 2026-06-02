'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

const TABS = [
  {
    path: '/',
    labelKey: 'nav_home' as const,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#58CC02' : '#9ca3af'}>
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    path: '/lessons',
    labelKey: 'nav_lessons' as const,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#58CC02' : '#9ca3af'}>
        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
      </svg>
    ),
  },
  {
    path: '/leaderboard',
    labelKey: 'nav_leaderboard' as const,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#58CC02' : '#9ca3af'}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" />
      </svg>
    ),
  },
  {
    path: '/profile',
    labelKey: 'nav_profile' as const,
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#58CC02' : '#9ca3af'}>
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const lang = useLang()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-100 z-40">
      <div className="max-w-lg mx-auto flex">
        {TABS.map(tab => {
          const active = tab.path === '/' ? pathname === '/' : pathname.startsWith(tab.path)
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-all active:scale-95"
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-bold ${active ? 'text-[#58CC02]' : 'text-gray-400'}`}>
                {t(tab.labelKey, lang)}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
