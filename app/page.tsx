'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
      if (!data.user) router.push('/login')
    })
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <span className="text-2xl font-bold text-emerald-600">iМектеп</span>
        <button onClick={signOut} className="text-sm text-gray-400 hover:text-gray-600">
          Выйти
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
          <p className="text-gray-500 text-sm">Добро пожаловать,</p>
          <h2 className="text-xl font-bold text-gray-800">
            {user.user_metadata?.full_name ?? 'Ученик'} 👋
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '📚', label: 'Уроки', color: 'bg-emerald-50 border-emerald-100', soon: false },
            { icon: '⚡', label: 'Быстрый счёт', color: 'bg-yellow-50 border-yellow-100', soon: false },
            { icon: '⚔️', label: '1v1 Дуэль', color: 'bg-red-50 border-red-100', soon: true },
            { icon: '🏆', label: 'Лидерборд', color: 'bg-purple-50 border-purple-100', soon: true },
          ].map((item) => (
            <div
              key={item.label}
              className={`relative rounded-2xl border p-5 flex flex-col items-center gap-2 cursor-pointer hover:scale-[1.02] transition-transform ${item.color}`}
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="font-semibold text-gray-700 text-sm">{item.label}</span>
              {item.soon && (
                <span className="absolute top-2 right-2 text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                  скоро
                </span>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
