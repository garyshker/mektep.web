'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Confirm we have a recovery session (set by /auth/callback)
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Ссылка недействительна или устарела. Запроси сброс пароля заново.')
      }
      setReady(true)
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Пароль должен быть минимум 6 символов'); return }
    if (password !== confirm) { setError('Пароли не совпадают'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Не удалось обновить пароль. Попробуй запросить сброс заново.')
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/'), 1500)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: '#F5F4F0' }}>

      <div className="text-5xl mb-3">🔑</div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Новый пароль</h1>
      <p className="text-gray-400 text-sm mb-8 text-center">Придумай новый пароль для входа</p>

      <div className="w-full max-w-sm">
        {done ? (
          <div className="bg-white rounded-3xl px-5 py-8 shadow-sm flex flex-col items-center gap-3">
            <div className="text-4xl">✅</div>
            <p className="font-black text-gray-900 text-lg">Пароль обновлён!</p>
            <p className="text-gray-400 text-sm text-center">Перенаправляем в приложение…</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl px-5 py-5 shadow-sm">
            <form onSubmit={submit} className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Новый пароль</p>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  required
                  autoComplete="new-password"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-semibold outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Повтори пароль</p>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Ещё раз пароль"
                  required
                  autoComplete="new-password"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-semibold outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <p className="text-red-600 text-sm font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !ready || !password || !confirm}
                className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-40 mt-1"
                style={{ background: '#1f2937', color: 'white' }}
              >
                {loading ? '...' : 'Сохранить пароль →'}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-gray-400 text-sm font-semibold py-1">
                ← Вернуться ко входу
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
