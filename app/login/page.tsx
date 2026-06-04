'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { LangSwitch } from '@/components/LangSwitch'
import { PopButton } from '@/components/PopButton'
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'

type Mode = 'login' | 'register' | 'forgot'

const inputCls =
  'w-full bg-muted rounded-[var(--radius)] pl-12 pr-12 py-3.5 text-foreground font-semibold outline-none border-2 border-transparent focus:border-primary focus:bg-card transition-all placeholder:text-muted-foreground/50 placeholder:font-normal'

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
    setMode(m); setError(''); setInfo(''); setPassword(''); setConfirm('')
  }

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setInfo('')
    if (!email.trim()) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
    })
    setLoading(false)
    if (error) {
      console.error('resetPasswordForEmail error:', error)
      const msg = error.message?.toLowerCase() ?? ''
      setError(msg.includes('rate') || error.status === 429 ? t('too_many_req', lang) : `${error.message}`)
      return
    }
    setInfo(t('reset_email_sent', lang))
  }

  // Hidden guest entry — tapping the mascot signs in anonymously
  const enterAsGuest = async () => {
    if (loading) return
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) {
      console.error('signInAnonymously error:', error)
      setError(t('guest_unavailable', lang)); setLoading(false); return
    }
    const base = lang === 'kk' ? 'Қонақ' : lang === 'en' ? 'Guest' : 'Гость'
    const suffix = data.user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
    await supabase.from('profiles').upsert({ id: data.user.id, name: `${base} ${suffix}`, grade: 2, language: lang })
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
      if (error) { setError(t('err_invalid_creds', lang)); setLoading(false); return }
      router.push('/')
    } else {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
      if (error) {
        setError(error.message.includes('already registered') ? t('err_registered', lang) : t('err_register', lang))
        setLoading(false); return
      }
      if (data.session) router.push('/setup')
      else { setError(t('confirm_sent', lang)); setLoading(false) }
    }
  }

  const heading = mode === 'login' ? t('login_heading', lang) : mode === 'register' ? t('reg_heading', lang) : t('forgot_heading', lang)
  const sub = mode === 'login' ? t('login_sub', lang) : mode === 'register' ? t('reg_sub', lang) : t('forgot_sub', lang)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative" style={{ background: 'var(--background)' }}>

      {/* Language switch */}
      <div className="absolute top-4 right-4 z-10"><LangSwitch /></div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">

        {/* ── Left: mascot + welcome ── */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          {/* Tapping the mascot is a hidden guest entry */}
          <button type="button" onClick={enterAsGuest} aria-label="Гость"
            className="active:scale-95 transition-transform cursor-pointer select-none">
            <Image src="/otter.png" alt="iМектеп" width={220} height={220} priority
              className="w-32 lg:w-56 h-auto drop-shadow-sm pointer-events-none" />
          </button>
          <h1 className="mt-5 text-3xl lg:text-5xl font-display font-black leading-tight text-foreground">
            {t('login_welcome', lang)} <span style={{ color: 'var(--primary)' }}>iМектеп</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-base lg:text-lg max-w-md">{t('login_tagline', lang)}</p>
        </div>

        {/* ── Right: form card ── */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-card rounded-[28px] px-6 sm:px-8 py-8 shadow-[var(--shadow-md)]">
            <h2 className="text-2xl font-display font-black text-foreground">{heading}</h2>
            <p className="text-muted-foreground text-sm mt-1 mb-6">{sub}</p>

            <form onSubmit={mode === 'forgot' ? sendReset : submit} className="flex flex-col gap-4">

              {/* Email */}
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground">{t('label_email', lang)}</label>
                <div className="relative">
                  <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@imektep.kz" required autoComplete="email" className={inputCls} />
                </div>
              </div>

              {/* Password */}
              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-foreground">{t('label_password', lang)}</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => switchMode('forgot')}
                        className="text-sm font-bold" style={{ color: 'var(--primary)' }}>{t('forgot_link', lang)}</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={t('ph_password', lang)} required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={inputCls} />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-90 transition-transform">
                      {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-bold mb-2 text-foreground">{t('label_confirm', lang)}</label>
                  <div className="relative">
                    <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder={t('ph_confirm', lang)} required autoComplete="new-password" className={inputCls} />
                  </div>
                </div>
              )}

              {/* Error / info */}
              {error && (
                <div className="rounded-[var(--radius)] px-4 py-3" style={{ background: 'color-mix(in oklch, var(--destructive) 12%, white)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>{error}</p>
                </div>
              )}
              {info && (
                <div className="rounded-[var(--radius)] px-4 py-3" style={{ background: 'color-mix(in oklch, var(--success) 14%, white)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>{info}</p>
                </div>
              )}

              {/* Submit */}
              <PopButton type="submit" variant="primary" full
                disabled={loading || !email.trim() || (mode !== 'forgot' && !password)}>
                {loading ? '...' : mode === 'login' ? t('btn_login', lang) : mode === 'register' ? t('btn_register', lang) : t('btn_send_link', lang)}
              </PopButton>
            </form>

            {/* Mode switch link */}
            <p className="text-center text-sm text-muted-foreground mt-5">
              {mode === 'login' && (<>{t('no_account', lang)}{' '}
                <button onClick={() => switchMode('register')} className="font-black" style={{ color: 'var(--primary)' }}>{t('create_account', lang)}</button></>)}
              {mode === 'register' && (<>{t('have_account', lang)}{' '}
                <button onClick={() => switchMode('login')} className="font-black" style={{ color: 'var(--primary)' }}>{t('btn_login', lang)}</button></>)}
              {mode === 'forgot' && (
                <button onClick={() => switchMode('login')} className="font-black" style={{ color: 'var(--primary)' }}>{t('back_to_login', lang)}</button>)}
            </p>

            {/* Guest entry — explicit */}
            {mode === 'login' && (
              <button type="button" onClick={enterAsGuest} disabled={loading}
                className="w-full mt-4 py-3 rounded-[var(--radius)] font-display font-bold border-2 border-border text-muted-foreground active:scale-[0.98] transition-transform disabled:opacity-50">
                {t('login_as_guest', lang)}
              </button>
            )}

            {/* Safety badge */}
            <div className="mt-4 flex items-center justify-center gap-2 rounded-[var(--radius)] py-2.5"
              style={{ background: 'color-mix(in oklch, var(--success) 12%, white)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--success)' }}>{t('safe_for_kids', lang)}</span>
            </div>
          </div>

          {/* Help link */}
          <p className="text-center text-sm text-muted-foreground mt-5">
            {t('need_help', lang)}{' '}
            <a href="mailto:support@imektep.kz" className="font-bold text-foreground">{t('write_us', lang)}</a>
          </p>
        </div>

      </div>
    </div>
  )
}
