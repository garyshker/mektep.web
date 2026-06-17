'use client'

import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/BottomNav'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { TRAINERS } from '@/lib/trainers'
import { ChevronRight, Infinity as InfinityIcon } from 'lucide-react'

export default function TrainPage() {
  const router = useRouter()
  const lang = useLang()

  return (
    <div className="min-h-screen pb-24 lg:pb-10 lg:pl-60" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 max-w-lg lg:max-w-2xl mx-auto">
        <h1 className="font-display font-black text-foreground text-xl">🎯 {t('train_title', lang)}</h1>
        <p className="text-xs text-muted-foreground">{t('train_pick', lang)}</p>
      </header>

      <main className="max-w-lg lg:max-w-2xl mx-auto px-4 grid grid-cols-2 gap-3">
        {/* Smart math — adaptive engine + mastery */}
        {([
          { path: '/train/smart-add', key: 'train_smart_add' as const },
          { path: '/train/smart-sub', key: 'train_smart_sub' as const },
          { path: '/train/smart-mul', key: 'train_smart_mul' as const },
          { path: '/train/smart-div', key: 'train_smart_div' as const },
        ]).map(s => (
          <button key={s.path} onClick={() => router.push(s.path)}
            className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left shadow-[var(--shadow-md)] active:translate-y-[-2px] transition-transform"
            style={{ background: 'var(--gradient-hero)' }}>
            <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">🧠</span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-white text-base">{t(s.key, lang)}</p>
              <p className="text-white/75 text-xs flex items-center gap-1">
                <InfinityIcon size={12} /> {t('sm_adaptive', lang)}
              </p>
            </div>
            <span className="text-xs font-black flex items-center gap-0.5 shrink-0 text-white">
              {t('game_go', lang)} <ChevronRight size={14} />
            </span>
          </button>
        ))}

        {/* Equations — its own page with the animated solver */}
        <button onClick={() => router.push('/train/equations')}
          className="col-span-2 rounded-[var(--radius)] p-4 flex items-center gap-4 text-left border-2 active:translate-y-[-2px] transition-transform"
          style={{ background: 'color-mix(in oklch, var(--primary) 10%, var(--card))', borderColor: 'color-mix(in oklch, var(--primary) 28%, var(--card))' }}>
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'color-mix(in oklch, var(--primary) 18%, transparent)' }}>🟰</span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-black text-foreground text-base">{t('train_eq', lang)}</p>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <InfinityIcon size={12} /> {t('train_subtitle', lang)} · x
            </p>
          </div>
          <span className="text-xs font-black flex items-center gap-0.5 shrink-0" style={{ color: 'var(--primary)' }}>
            {t('game_go', lang)} <ChevronRight size={14} />
          </span>
        </button>

        {TRAINERS.map(tr => (
          <button key={tr.id} onClick={() => router.push(`/train/${tr.id}`)}
            className="rounded-[var(--radius)] p-4 flex flex-col gap-2 text-left border active:translate-y-[-2px] transition-transform"
            style={{ background: tr.color, borderColor: tr.border }}>
            <span className="text-3xl">{tr.emoji}</span>
            <div>
              <p className="font-display font-black text-foreground text-sm">{t(tr.titleKey, lang)}</p>
              <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                <InfinityIcon size={12} /> {t('train_subtitle', lang)}
              </p>
            </div>
            <span className="text-[11px] font-black flex items-center gap-0.5 self-start" style={{ color: 'var(--primary)' }}>
              {t('game_go', lang)} <ChevronRight size={13} />
            </span>
          </button>
        ))}
      </main>

      <BottomNav />
    </div>
  )
}
