'use client'

// The trust page. A teacher or a parent deciding whether to let children onto an
// unknown site looks for exactly this: a real person, what happens to the data,
// and how to reach someone. Deliberately short — and deliberately NOT linked
// from any child-facing screen, because the support line lives here.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ArrowLeft, Heart, MessageCircle, ShieldCheck, Copy, Check } from 'lucide-react'
import type { CSSProperties } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// FILL THESE IN. Left blank on purpose — a block renders only once its value is
// set, so nothing shows as an empty placeholder to a visitor.
const AUTHOR = 'Kaisar Myrzakhmet'
const KASPI_PHONE = '+7 707 130 6660'
const KASPI_QR = ''               // business/ИП only — an individual has no Kaspi QR, so leave this
                                  // empty and use the phone number above; the block then does not render
const AUTHOR_PHOTO = ''           // e.g. '/author.jpg' — drop the image in public/
const FEEDBACK_URL = 'mailto:kaisar@list.ru'   // the address already published on /login;
                                              // swap for 'https://wa.me/77071306660' if WhatsApp suits better
// ─────────────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  const router = useRouter()
  const lang = useLang()
  const [copied, setCopied] = useState(false)

  const copyKaspi = async () => {
    try { await navigator.clipboard.writeText(KASPI_PHONE); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* clipboard blocked */ }
  }

  return (
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10 lg:pl-60 lg:pt-8"
      style={{ background: 'var(--background)' }}>

      <header className="px-4 pt-6 pb-4 max-w-lg lg:max-w-2xl mx-auto flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back"
          className="w-11 h-11 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-black text-foreground text-2xl leading-tight">{t('about_title', lang)}</h1>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4 flex flex-col gap-4">

        {/* What this is, and who made it */}
        <div className="bg-card rounded-[var(--radius-lg)] px-5 py-5 shadow-[var(--shadow-sm)] flex flex-col gap-4">
          <p className="text-base text-foreground leading-relaxed">{t('about_lead', lang)}</p>
          <p className="text-base font-bold leading-relaxed" style={{ color: 'var(--primary-ink)' }}>
            {t('about_free', lang)}
          </p>

          <div className="flex items-center gap-3 pt-1">
            {AUTHOR_PHOTO ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={AUTHOR_PHOTO} alt={AUTHOR} className="w-14 h-14 rounded-full object-cover shrink-0"
                style={{ boxShadow: '0 0 0 3px color-mix(in oklch, var(--primary) 24%, transparent)' }} />
            ) : (
              <span className="w-14 h-14 rounded-full flex items-center justify-center font-display font-black text-white text-lg shrink-0"
                style={{ background: 'var(--gradient-hero)' }}>
                {AUTHOR.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black text-muted-foreground">{t('about_author', lang)}</p>
              <p className="font-display font-black text-foreground text-lg leading-tight">{AUTHOR}</p>
            </div>
          </div>
        </div>

        {/* Data — the part a school actually reads */}
        <div className="rounded-[var(--radius-lg)] px-5 py-5 flex flex-col gap-2.5"
          style={{ background: 'color-mix(in oklch, var(--cat-sea) 9%, var(--card))',
            border: '2px solid color-mix(in oklch, var(--cat-sea) 22%, var(--card))' }}>
          <p className="font-display font-black text-foreground text-lg flex items-center gap-2">
            <ShieldCheck size={22} style={{ color: 'var(--cat-sea)' }} /> {t('about_data_title', lang)}
          </p>
          <p className="text-sm text-foreground/85 leading-relaxed">{t('about_data', lang)}</p>
        </div>

        {/* Feedback — a bug reported is a bug fixed the same evening */}
        {FEEDBACK_URL && (
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer"
            className="rounded-[var(--radius-lg)] px-5 py-4 flex items-center gap-3.5 shadow-[var(--shadow-md)] active:translate-y-[2px] transition-transform"
            style={{ background: 'var(--gradient-hero)' }}>
            <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <MessageCircle size={24} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-display font-black text-white text-lg leading-tight">{t('about_feedback', lang)}</span>
              <span className="block text-white/85 text-sm">{t('about_feedback_sub', lang)}</span>
            </span>
            <span className="text-white font-display font-black text-sm shrink-0">{t('about_feedback_btn', lang)}</span>
          </a>
        )}

        {/* Support — quiet, optional, and never in front of a child */}
        {(KASPI_PHONE || KASPI_QR) && (
          <div className="bg-card rounded-[var(--radius-lg)] px-5 py-5 shadow-[var(--shadow-sm)] flex flex-col gap-3">
            <p className="font-display font-black text-foreground text-lg flex items-center gap-2">
              <Heart size={20} style={{ color: 'var(--cat-rose)' }} /> {t('about_support', lang)}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('about_support_note', lang)}</p>

            {KASPI_PHONE && (
              <button onClick={copyKaspi}
                className="rounded-[var(--radius)] px-4 py-3.5 flex items-center gap-3 border-2 min-h-[56px] active:translate-y-[2px] transition-transform"
                style={{ background: 'color-mix(in oklch, var(--cat-rose) 8%, var(--card))',
                  borderColor: 'color-mix(in oklch, var(--cat-rose) 24%, var(--card))' } as CSSProperties}>
                <span className="flex-1 text-left min-w-0">
                  <span className="block text-xs font-black text-muted-foreground">{t('about_kaspi', lang)}</span>
                  <span className="block font-display font-black text-foreground text-lg tabular">{KASPI_PHONE}</span>
                </span>
                {copied
                  ? <span className="flex items-center gap-1 text-sm font-black shrink-0" style={{ color: 'var(--success)' }}><Check size={18} /> {t('about_copied', lang)}</span>
                  : <Copy size={20} className="text-muted-foreground shrink-0" />}
              </button>
            )}

            {KASPI_QR && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={KASPI_QR} alt="Kaspi QR" className="w-44 h-44 rounded-2xl object-contain self-center mt-1"
                style={{ background: 'var(--card)', border: '2px solid var(--border)' }} />
            )}
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  )
}
