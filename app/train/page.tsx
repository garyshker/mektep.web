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
