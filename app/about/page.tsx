'use client'

// The trust page. A teacher or a parent deciding whether to let children onto an
// unknown site looks for exactly this: a real person, what happens to the data,
// and how to reach someone. Deliberately short — and deliberately NOT linked
// from any child-facing screen, because the support line lives here.
//
// Its look is on purpose unlike the rest of the app: hard rules, numbered
// sections, square corners and a cubist plate up top. The trainers are soft and
// rounded because a six-year-old uses them; this page is read by an adult
// deciding whether to trust the thing, and it should feel like a document.
// Every colour is still a token, so dark mode and the palette hold.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ArrowLeft, MessageCircle, Copy, Check, CreditCard, Smartphone } from 'lucide-react'
import type { CSSProperties } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
const AUTHOR = 'Kaisar Myrzakhmet'
const KASPI_PHONE = '+7 707 130 6660'
const KASPI_CARD = '4400 4302 4232 3670'
const KASPI_QR = ''               // business/ИП only — an individual has no Kaspi QR, so leave this
                                  // empty and use the phone number above; the block then does not render
const KASPI_LOGO = ''             // drop the official SVG/PNG in public/ and put its path here;
                                  // until then a neutral badge stands in — we don't redraw a trademark
const AUTHOR_PHOTO = ''           // e.g. '/author.jpg' — drop the image in public/
const FEEDBACK_URL = 'mailto:kaisar@list.ru'   // the address already published on /login;
                                              // swap for 'https://wa.me/77071306660' if WhatsApp suits better
// ─────────────────────────────────────────────────────────────────────────────

/** Cubist plate: flat planes, hard outlines, three accents and nothing else. */
function Plate() {
  const line = { stroke: 'var(--foreground)', strokeWidth: 2.5, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 320 150" className="w-full h-auto block" aria-hidden>
      <rect x="0" y="0" width="320" height="150" fill="var(--cat-gold)" opacity="0.16" />
      <path d="M8 142 L8 34 L96 34 L96 142 Z" fill="var(--cat-rose)" opacity="0.9" {...line} />
      <path d="M96 142 L96 62 L182 62 L182 142 Z" fill="var(--cat-sky)" opacity="0.9" {...line} />
      <circle cx="182" cy="62" r="44" fill="var(--cat-gold)" {...line} />
      <path d="M226 142 A44 44 0 0 0 182 98 L182 142 Z" fill="var(--card)" {...line} />
      <path d="M240 142 L240 44 L296 16 L296 142 Z" fill="var(--primary)" {...line} />
      <path d="M8 34 L96 34" {...line} />
      <path d="M0 142 L320 142" stroke="var(--foreground)" strokeWidth="3" />
    </svg>
  )
}

/** A numbered section rule — the "document" spine of the page. */
function Rule({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-baseline gap-3 pt-4" style={{ borderTop: '3px solid var(--foreground)' }}>
      <span className="font-display font-black text-sm tabular" style={{ color: 'var(--cat-rose)' }}>{n}</span>
      <h2 className="font-display font-black text-foreground text-xl leading-tight">{label}</h2>
    </div>
  )
}

export default function AboutPage() {
  const router = useRouter()
  const lang = useLang()
  const [copied, setCopied] = useState<'phone' | 'card' | null>(null)

  const copy = async (what: 'phone' | 'card', value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(what); setTimeout(() => setCopied(null), 1600) } catch { /* clipboard blocked */ }
  }

  const initials = AUTHOR.split(' ').map(w => w[0]).join('').slice(0, 2)

  return (
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10 lg:pl-60 lg:pt-8"
      style={{ background: 'var(--background)' }}>

      <header className="px-4 pt-6 pb-4 max-w-lg lg:max-w-2xl mx-auto flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back"
          className="w-11 h-11 flex items-center justify-center shrink-0 text-foreground"
          style={{ border: '2.5px solid var(--foreground)', borderRadius: 'var(--radius-sm)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-display font-black text-foreground text-3xl leading-none tracking-tight">
          {t('about_title', lang)}
        </h1>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4 flex flex-col gap-7">

        {/* ── The plate ── */}
        <div style={{ border: '3px solid var(--foreground)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <Plate />
        </div>

        {/* ── 01 · what this is ── */}
        <section className="flex flex-col gap-3">
          <Rule n="01" label="Ushkyn" />
          <p className="text-base text-foreground leading-relaxed">{t('about_lead', lang)}</p>
          <p className="font-display font-black text-xl leading-snug" style={{ color: 'var(--primary-ink)' }}>
            {t('about_free', lang)}
          </p>

          <div className="flex items-center gap-3.5 mt-1">
            {AUTHOR_PHOTO ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={AUTHOR_PHOTO} alt={AUTHOR} className="w-16 h-16 object-cover shrink-0"
                style={{ border: '2.5px solid var(--foreground)', borderRadius: 'var(--radius-sm)' }} />
            ) : (
              <span className="w-16 h-16 flex items-center justify-center font-display font-black text-xl shrink-0"
                style={{ background: 'var(--cat-gold)', color: 'var(--foreground)',
                  border: '2.5px solid var(--foreground)', borderRadius: 'var(--radius-sm)' }}>
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black tracking-[0.18em] text-muted-foreground">{t('about_author', lang)}</p>
              <p className="font-display font-black text-foreground text-lg leading-tight">{AUTHOR}</p>
            </div>
          </div>
        </section>

        {/* ── 02 · the data, the part a school actually reads ── */}
        <section className="flex flex-col gap-3">
          <Rule n="02" label={t('about_data_title', lang)} />
          <p className="text-base text-foreground/85 leading-relaxed"
            style={{ borderLeft: '4px solid var(--cat-sea)', paddingLeft: '0.9rem' }}>
            {t('about_data', lang)}
          </p>
        </section>

        {/* ── 03 · support ── */}
        {(KASPI_PHONE || KASPI_CARD || KASPI_QR) && (
          <section className="flex flex-col gap-3">
            <Rule n="03" label={t('about_support', lang)} />
            <p className="text-sm text-muted-foreground leading-relaxed">{t('about_support_note', lang)}</p>

            {(KASPI_PHONE || KASPI_CARD) && (
              <div className="flex flex-col"
                style={{ background: 'var(--card)', border: '2.5px solid var(--foreground)',
                  borderRadius: 'var(--radius-sm)', boxShadow: '4px 4px 0 var(--cat-rose)' } as CSSProperties}>
                {KASPI_PHONE && (
                  <button onClick={() => copy('phone', KASPI_PHONE)}
                    className="flex items-center gap-3.5 px-4 py-3.5 min-h-[64px] text-left active:opacity-70 transition-opacity"
                    style={KASPI_CARD ? { borderBottom: '2px solid var(--border)' } : undefined}>
                    {KASPI_LOGO ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={KASPI_LOGO} alt="" className="w-11 h-11 object-contain shrink-0" />
                    ) : (
                      <span className="w-11 h-11 flex items-center justify-center shrink-0"
                        style={{ background: 'var(--cat-rose)', borderRadius: 'var(--radius-sm)', color: 'var(--card)' }}>
                        <Smartphone size={22} />
                      </span>
                    )}
                    <span className="flex-1 min-w-0 font-display font-black text-foreground text-xl tabular leading-tight">
                      {KASPI_PHONE}
                    </span>
                    {copied === 'phone'
                      ? <span className="flex items-center gap-1 text-sm font-black shrink-0" style={{ color: 'var(--success)' }}><Check size={18} /> {t('about_copied', lang)}</span>
                      : <Copy size={20} className="text-muted-foreground shrink-0" />}
                  </button>
                )}
                {KASPI_CARD && (
                  <button onClick={() => copy('card', KASPI_CARD)}
                    className="flex items-center gap-3.5 px-4 py-3.5 min-h-[64px] text-left active:opacity-70 transition-opacity">
                    <span className="w-11 h-11 flex items-center justify-center shrink-0"
                      style={{ background: 'var(--cat-sky)', borderRadius: 'var(--radius-sm)', color: 'var(--card)' }}>
                      <CreditCard size={22} />
                    </span>
                    <span className="flex-1 min-w-0 font-display font-black text-foreground text-xl tabular leading-tight">
                      {KASPI_CARD}
                    </span>
                    {copied === 'card'
                      ? <span className="flex items-center gap-1 text-sm font-black shrink-0" style={{ color: 'var(--success)' }}><Check size={18} /> {t('about_copied', lang)}</span>
                      : <Copy size={20} className="text-muted-foreground shrink-0" />}
                  </button>
                )}
              </div>
            )}

            {KASPI_QR && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={KASPI_QR} alt="Kaspi QR" className="w-44 h-44 object-contain self-center"
                style={{ background: 'var(--card)', border: '2.5px solid var(--foreground)', borderRadius: 'var(--radius-sm)' }} />
            )}
          </section>
        )}

        {/* ── feedback — the one loud element on the page ── */}
        {FEEDBACK_URL && (
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3.5 px-5 py-4 min-h-[68px] active:translate-y-[2px] transition-transform"
            style={{ background: 'var(--foreground)', borderRadius: 'var(--radius-sm)' }}>
            <span className="w-11 h-11 flex items-center justify-center shrink-0"
              style={{ background: 'var(--cat-gold)', borderRadius: 'var(--radius-sm)', color: 'var(--foreground)' }}>
              <MessageCircle size={22} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-display font-black text-lg leading-tight" style={{ color: 'var(--background)' }}>
                {t('about_feedback', lang)}
              </span>
              <span className="block text-sm" style={{ color: 'var(--background)', opacity: 0.75 }}>
                {t('about_feedback_sub', lang)}
              </span>
            </span>
            <span className="font-display font-black text-sm shrink-0" style={{ color: 'var(--cat-gold)' }}>
              {t('about_feedback_btn', lang)}
            </span>
          </a>
        )}

      </main>

      <BottomNav />
    </div>
  )
}
