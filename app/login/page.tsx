'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-sm text-center">
        <img src="/otter.png" alt="Otti" className="w-24 h-24 mx-auto mb-4 rounded-full" />
        <h1 className="text-3xl font-bold text-emerald-700 mb-1">iМектеп</h1>
        <p className="text-gray-500 mb-8">Учись. Играй. Развивайся.</p>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-8">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="font-bold text-gray-800 mb-1">Письмо отправлено!</h2>
            <p className="text-sm text-gray-500">
              Проверь почту <strong>{email}</strong> и нажми на ссылку для входа.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-sm text-emerald-600 hover:underline"
            >
              Другой email
            </button>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Введи email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-2xl px-4 py-4 text-gray-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-2xl px-6 py-4 transition-all active:scale-95"
            >
              {loading ? 'Отправляем...' : 'Войти по ссылке →'}
            </button>
          </form>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Без пароля — просто ссылка на почту
        </p>
      </div>
    </div>
  )
}
