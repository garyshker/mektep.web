'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'

const ORANGE = '#E8943A'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  // Confirm we have a recovery session (set by /auth/callback)
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) setError(t('reset_link_invalid', lang))
      setReady(true)
    }
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(t('err_pw_short', lang)); return }
    if (password !== confirm) { setError(t('err_pw_mismatch', lang)); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(t('reset_fail', lang))
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.push('/'), 1500)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: '#FAF6EF' }}>

      <div className="text-5xl mb-3">🔑</div>
      <h1 className="text-2xl font-black mb-1" style={{ color: '#2D2A26' }}>{t('reset_title', lang)}</h1>
      <p className="text-gray-400 text-sm mb-8 text-center">{t('reset_subtitle', lang)}</p>

      <div className="w-full max-w-sm">
        {done ? (
          <div className="bg-white rounded-[28px] px-5 py-8 shadow-sm flex flex-col items-center gap-3">
            <div className="text-4xl">✅</div>
            <p className="font-black text-gray-900 text-lg">{t('reset_done', lang)}</p>
            <p className="text-gray-400 text-sm text-center">{t('reset_redirect', lang)}</p>
          </div>
        ) : (
          <div className="bg-white rounded-[28px] px-6 py-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)]">
            <form onSubmit={submit} className="flex flex-col gap-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#2D2A26' }}>{t('reset_label_new', lang)}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('ph_password', lang)}
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#F5F2EC] rounded-2xl pl-12 pr-12 py-3.5 text-gray-900 font-semibold outline-none border-2 border-transparent focus:border-[#E8943A] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 active:scale-90 transition-transform">
                    {showPw ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="m2 2 20 20" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#2D2A26' }}>{t('label_confirm', lang)}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder={t('ph_confirm', lang)}
                    required
                    autoComplete="new-password"
                    className="w-full bg-[#F5F2EC] rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 font-semibold outline-none border-2 border-transparent focus:border-[#E8943A] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <p className="text-red-600 text-sm font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !ready || !password || !confirm}
                className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-[0.98] disabled:opacity-40 shadow-sm"
                style={{ background: 'linear-gradient(180deg, #F5BE4A 0%, #ED9F34 100%)' }}
              >
                {loading ? '...' : t('reset_save', lang)}
              </button>

              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-sm font-bold py-1" style={{ color: ORANGE }}>
                {t('back_to_login', lang)}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
