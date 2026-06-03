'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { PopButton } from '@/components/PopButton'
import { Lock, Eye, EyeOff } from 'lucide-react'

const inputCls =
  'w-full bg-muted rounded-[var(--radius)] pl-12 pr-12 py-3.5 text-foreground font-semibold outline-none border-2 border-transparent focus:border-primary focus:bg-card transition-all placeholder:text-muted-foreground/50 placeholder:font-normal'

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
    if (error) { setError(t('reset_fail', lang)); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/'), 1500)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ background: 'var(--background)' }}>

      <div className="text-5xl mb-3">🔑</div>
      <h1 className="text-2xl font-display font-black mb-1 text-foreground">{t('reset_title', lang)}</h1>
      <p className="text-muted-foreground text-sm mb-8 text-center">{t('reset_subtitle', lang)}</p>

      <div className="w-full max-w-sm">
        {done ? (
          <div className="bg-card rounded-[28px] px-5 py-8 shadow-[var(--shadow-sm)] flex flex-col items-center gap-3">
            <div className="text-4xl">✅</div>
            <p className="font-display font-black text-foreground text-lg">{t('reset_done', lang)}</p>
            <p className="text-muted-foreground text-sm text-center">{t('reset_redirect', lang)}</p>
          </div>
        ) : (
          <div className="bg-card rounded-[28px] px-6 py-6 shadow-[var(--shadow-md)]">
            <form onSubmit={submit} className="flex flex-col gap-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground">{t('reset_label_new', lang)}</label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={t('ph_password', lang)} required autoComplete="new-password" className={inputCls} />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground active:scale-90 transition-transform">
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground">{t('label_confirm', lang)}</label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder={t('ph_confirm', lang)} required autoComplete="new-password" className={inputCls} />
                </div>
              </div>

              {error && (
                <div className="rounded-[var(--radius)] px-4 py-3" style={{ background: 'color-mix(in oklch, var(--destructive) 12%, white)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--destructive)' }}>{error}</p>
                </div>
              )}

              <PopButton type="submit" variant="primary" full disabled={loading || !ready || !password || !confirm}>
                {loading ? '...' : t('reset_save', lang)}
              </PopButton>

              <button type="button" onClick={() => router.push('/login')}
                className="text-sm font-bold py-1" style={{ color: 'var(--primary)' }}>
                {t('back_to_login', lang)}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
