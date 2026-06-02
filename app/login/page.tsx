'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Mode = 'login' | 'register' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
    setPassword('')
    setConfirm('')
  }

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
    })
    setLoading(false)
    if (error) {
      console.error('resetPasswordForEmail error:', error)
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('rate') || error.status === 429) {
        setError('Слишком много запросов. Подожди час или подключи свой SMTP в Supabase.')
      } else {
        setError(`Ошибка: ${error.message} (код ${error.status ?? '?'})`)
      }
      return
    }
    setInfo('Письмо со ссылкой для сброса отправлено. Проверь почту (и папку «Спам»).')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) return

    if (mode === 'register') {
      if (password.length < 6) { setError('Пароль должен быть минимум 6 символов'); return }
      if (password !== confirm) { setError('Пароли не совпадают'); return }
    }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError('Неверный email или пароль')
        setLoading(false)
        return
      }
      router.push('/')
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) {
        if (error.message.includes('already registered')) {
          setError('Этот email уже зарегистрирован. Попробуй войти.')
        } else if (error.message.toLowerCase().includes('confirmation email') || error.message.toLowerCase().includes('sending')) {
          setError('Ошибка отправки письма. Попробуй ещё раз или войди если уже зарегистрирован.')
        } else {
          setError('Ошибка регистрации. Попробуй ещё раз.')
        }
        setLoading(false)
        return
      }
      // If email confirmation is disabled in Supabase, session is created immediately
      if (data.session) {
        router.push('/setup')
      } else {
        // Email confirmation required — try signing in anyway or show message
        setError('На почту отправлено письмо подтверждения. Подтверди и войди.')
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: '#F5F4F0' }}>

      {/* Logo */}
      <div className="text-5xl mb-3">🎓</div>
      <h1 className="text-3xl font-black text-gray-900 mb-1">iМектеп</h1>
      <p className="text-gray-400 text-sm mb-8">Учись. Играй. Развивайся.</p>

      <div className="w-full max-w-sm flex flex-col gap-4">

        {/* Mode toggle */}
        {mode !== 'forgot' && (
          <div className="bg-white rounded-2xl p-1 flex shadow-sm">
            <button
              onClick={() => switchMode('login')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={mode === 'login' ? { background: '#1f2937', color: 'white' } : { color: '#9ca3af' }}
            >
              Войти
            </button>
            <button
              onClick={() => switchMode('register')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={mode === 'register' ? { background: '#1f2937', color: 'white' } : { color: '#9ca3af' }}
            >
              Регистрация
            </button>
          </div>
        )}

        {/* Forgot-password card */}
        {mode === 'forgot' && (
          <div className="bg-white rounded-3xl px-5 py-5 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="font-black text-gray-900 text-lg">Сброс пароля</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Введи email — пришлём ссылку для создания нового пароля.
              </p>
            </div>
            <form onSubmit={sendReset} className="flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Email</p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  required
                  autoComplete="email"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-semibold outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <p className="text-red-600 text-sm font-semibold">{error}</p>
                </div>
              )}
              {info && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                  <p className="text-emerald-700 text-sm font-semibold">{info}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-40 mt-1"
                style={{ background: '#1f2937', color: 'white' }}
              >
                {loading ? '...' : 'Отправить ссылку →'}
              </button>

              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-gray-400 text-sm font-semibold py-1">
                ← Вернуться ко входу
              </button>
            </form>
          </div>
        )}

        {/* Form card */}
        {mode !== 'forgot' && (
        <div className="bg-white rounded-3xl px-5 py-5 shadow-sm flex flex-col gap-4">
          <form onSubmit={submit} className="flex flex-col gap-3">

            {/* Email */}
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Email</p>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
                autoComplete="email"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-semibold outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Пароль</p>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 text-gray-900 font-semibold outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            {/* Confirm (register only) */}
            {mode === 'register' && (
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
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-red-600 text-sm font-semibold">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 disabled:opacity-40 mt-1"
              style={{ background: '#1f2937', color: 'white' }}
            >
              {loading
                ? '...'
                : mode === 'login' ? 'Войти →' : 'Создать аккаунт →'}
            </button>

            {/* Forgot password link (login only) */}
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-gray-400 text-sm font-semibold py-1 mt-1">
                Забыли пароль?
              </button>
            )}
          </form>
        </div>
        )}

      </div>
    </div>
  )
}
