'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { LangSwitch } from '@/components/LangSwitch'

type Mode = 'login' | 'register' | 'forgot'

const ORANGE = '#E8943A'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

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
        setError(t('too_many_req', lang))
      } else {
        setError(`${error.message}`)
      }
      return
    }
    setInfo(t('reset_email_sent', lang))
  }

  // Hidden guest entry — tapping the mascot signs in anonymously
  const enterAsGuest = async () => {
    if (loading) return
    setError('')
    setLoading(true)
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      console.error('signInAnonymously error:', error)
      setError(t('guest_unavailable', lang))
      setLoading(false)
      return
    }
    const base = lang === 'kk' ? 'Қонақ' : lang === 'en' ? 'Guest' : 'Гость'
    const suffix = data.user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
    const guestName = `${base} ${suffix}`
    await supabase.from('profiles').upsert({
      id: data.user.id, name: guestName, grade: 2, language: lang,
    })
    router.push('/')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) return

    if (mode === 'register') {
      if (password.length < 6) { setError(t('err_pw_short', lang)); return }
      if (password !== confirm) { setError(t('err_pw_mismatch', lang)); return }
    }

    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        setError(t('err_invalid_creds', lang))
        setLoading(false)
        return
      }
      router.push('/')
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) {
        if (error.message.includes('already registered')) {
          setError(t('err_registered', lang))
        } else {
          setError(t('err_register', lang))
        }
        setLoading(false)
        return
      }
      if (data.session) {
        router.push('/setup')
      } else {
        setError(t('confirm_sent', lang))
        setLoading(false)
      }
    }
  }

  const heading =
    mode === 'login' ? t('login_heading', lang) :
    mode === 'register' ? t('reg_heading', lang) : t('forgot_heading', lang)
  const sub =
    mode === 'login' ? t('login_sub', lang) :
    mode === 'register' ? t('reg_sub', lang) : t('forgot_sub', lang)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative" style={{ background: '#FAF6EF' }}>

      {/* Language switch — top right */}
      <div className="absolute top-4 right-4 z-10">
        <LangSwitch />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">

        {/* ── Left: mascot + welcome ── */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          {/* Tapping the mascot is a hidden guest entry */}
          <button
            type="button"
            onClick={enterAsGuest}
            aria-label="Гость"
            className="active:scale-95 transition-transform cursor-pointer select-none"
          >
            <Image
              src="/otter.png"
              alt="iМектеп"
              width={220}
              height={220}
              priority
              className="w-32 lg:w-56 h-auto drop-shadow-sm pointer-events-none"
            />
          </button>
          <h1 className="mt-5 text-3xl lg:text-5xl font-black leading-tight" style={{ color: '#2D2A26' }}>
            {t('login_welcome', lang)} <span style={{ color: ORANGE }}>iМектеп</span>
          </h1>
          <p className="mt-3 text-gray-500 text-base lg:text-lg max-w-md">
            {t('login_tagline', lang)}
          </p>
        </div>

        {/* ── Right: form card ── */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-[28px] px-6 sm:px-8 py-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)]">
            <h2 className="text-2xl font-black" style={{ color: '#2D2A26' }}>{heading}</h2>
            <p className="text-gray-400 text-sm mt-1 mb-6">{sub}</p>

            <form onSubmit={mode === 'forgot' ? sendReset : submit} className="flex flex-col gap-4">

              {/* Email */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#2D2A26' }}>{t('label_email', lang)}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@imektep.kz"
                    required
                    autoComplete="email"
                    className="w-full bg-[#F5F2EC] rounded-2xl pl-12 pr-4 py-3.5 text-gray-900 font-semibold outline-none border-2 border-transparent focus:border-[#E8943A] focus:bg-white transition-all placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Password (login + register) */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold" style={{ color: '#2D2A26' }}>{t('label_password', lang)}</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => switchMode('forgot')}
                        className="text-sm font-bold" style={{ color: ORANGE }}>
                        {t('forgot_link', lang)}
                      </button>
                    )}
                  </div>
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
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
              )}

              {/* Confirm (register only) */}
              {mode === 'register' && (
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
              )}

              {/* Error / info */}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !email.trim() || (mode !== 'forgot' && !password)}
                className="w-full py-4 rounded-2xl font-black text-base text-white transition-all active:scale-[0.98] disabled:opacity-40 shadow-sm"
                style={{ background: 'linear-gradient(180deg, #F5BE4A 0%, #ED9F34 100%)' }}
              >
                {loading ? '...' :
                  mode === 'login' ? t('btn_login', lang) :
                  mode === 'register' ? t('btn_register', lang) : t('btn_send_link', lang)}
              </button>
            </form>

            {/* Mode switch link */}
            <p className="text-center text-sm text-gray-500 mt-5">
              {mode === 'login' && (
                <>{t('no_account', lang)}{' '}
                  <button onClick={() => switchMode('register')} className="font-black" style={{ color: ORANGE }}>{t('create_account', lang)}</button>
                </>
              )}
              {mode === 'register' && (
                <>{t('have_account', lang)}{' '}
                  <button onClick={() => switchMode('login')} className="font-black" style={{ color: ORANGE }}>{t('btn_login', lang)}</button>
                </>
              )}
              {mode === 'forgot' && (
                <button onClick={() => switchMode('login')} className="font-black" style={{ color: ORANGE }}>{t('back_to_login', lang)}</button>
              )}
            </p>

            {/* Safety badge */}
            <div className="mt-5 flex items-center justify-center gap-2 bg-emerald-50 rounded-2xl py-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span className="text-emerald-700 text-sm font-bold">{t('safe_for_kids', lang)}</span>
            </div>
          </div>

          {/* Help link */}
          <p className="text-center text-sm text-gray-400 mt-5">
            {t('need_help', lang)}{' '}
            <a href="mailto:support@imektep.kz" className="font-bold text-gray-600">{t('write_us', lang)}</a>
          </p>
        </div>

      </div>
    </div>
  )
}
