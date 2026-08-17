'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { playCorrect, playWrong, playTap } from '@/lib/sounds'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { useRound, RoundDots, RoundMilestone } from '@/components/round'
import { HintButton, HintOffer, HintScaffold, type HintStep } from '@/components/hints'
import { touchStreak } from '@/lib/streak'
import { logTrainerAttempt } from '@/lib/mastery'
import { X, Flame, Square, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'

// Grade-2: two-step word problems. The skill is seeing that ONE answer needs
// TWO steps. Solved in two guided phases: first the intermediate result, then
// the final answer — so the child learns to break a story into steps.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

const rp = (n: number, f: [string, string, string]) =>
  n % 10 === 1 && n % 100 !== 11 ? f[0]
  : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1]
  : f[2]

type L3 = { kk: string; ru: string; en: string }
// step1 = intermediate result, answer = final. q1/q2 are the two questions.
type P = { emoji: string; story: L3; q1: L3; step1: number; expr1: string; q2: L3; answer: number; expr2: string }

function gen(prev?: string): P {
  const kinds = ['add_then_sub', 'sub_then_add', 'mul_then_add', 'add_then_add']
  let kind = kinds[ri(0, kinds.length - 1)]
  if (prev && kind === prev) kind = kinds[ri(0, kinds.length - 1)]

  if (kind === 'mul_then_add') {
    const g = ri(2, 4), e = ri(2, 4), extra = ri(1, 5)
    const s1 = g * e, ans = s1 + extra
    return {
      emoji: '🍬', story: {
        ru: `Купили ${g} ${rp(g, ['пачку', 'пачки', 'пачек'])} по ${e} ${rp(e, ['конфете', 'конфеты', 'конфет'])}, и ещё ${extra} россыпью.`,
        kk: `${g} қорап, әрқайсысында ${e} кәмпит алды, тағы ${extra} бөлек алды.`,
        en: `Bought ${g} packs of ${e} sweets each, and ${extra} more loose.` },
      q1: { ru: 'Сколько в пачках?', kk: 'Қораптарда нешеу?', en: 'How many in the packs?' },
      step1: s1, expr1: `${g} × ${e}`,
      q2: { ru: 'Сколько всего конфет?', kk: 'Барлығы неше кәмпит?', en: 'How many sweets in all?' },
      answer: ans, expr2: `${s1} + ${extra}`,
    }
  }
  if (kind === 'sub_then_add') {
    const start = ri(10, 18), gone = ri(3, 7), came = ri(2, 6)
    const s1 = start - gone, ans = s1 + came
    return {
      emoji: '🐑', story: {
        ru: `На жайлау было ${start} овец, ${gone} увели, потом привели ещё ${came}.`,
        kk: `Жайлауда ${start} қой болды, ${gone} қойды әкетті, кейін тағы ${came} қой әкелді.`,
        en: `${start} sheep in the pasture, ${gone} were taken away, then ${came} more were brought.` },
      q1: { ru: 'Сколько осталось после увода?', kk: 'Әкеткеннен кейін нешеу қалды?', en: 'How many after some left?' },
      step1: s1, expr1: `${start} − ${gone}`,
      q2: { ru: 'Сколько овец стало?', kk: 'Қанша қой болды?', en: 'How many sheep now?' },
      answer: ans, expr2: `${s1} + ${came}`,
    }
  }
  if (kind === 'add_then_add') {
    const a = ri(3, 7), b = ri(3, 6), c = ri(2, 5)
    const s1 = a + b, ans = s1 + c
    return {
      emoji: '🥯', story: {
        ru: `Мама испекла ${a}, бабушка ${b}, а сестра ещё ${c} баурсака.`,
        kk: `Анам ${a}, әжем ${b}, ал әпкем тағы ${c} бауырсақ пісірді.`,
        en: `Mom baked ${a}, grandma ${b}, and sister ${c} more baursaks.` },
      q1: { ru: 'Сколько у мамы и бабушки?', kk: 'Ана мен әжеде нешеу?', en: 'Mom and grandma together?' },
      step1: s1, expr1: `${a} + ${b}`,
      q2: { ru: 'Сколько всего?', kk: 'Барлығы қанша?', en: 'How many in total?' },
      answer: ans, expr2: `${s1} + ${c}`,
    }
  }
  // add_then_sub
  const a = ri(4, 8), b = ri(3, 7), gone = ri(2, 6)
  const s1 = a + b, ans = s1 - gone
  return {
    emoji: '🎈', story: {
      ru: `На той принесли ${a} шаров и ещё ${b}, потом ${gone} лопнули.`,
      kk: `Тойға ${a} шар және тағы ${b} шар әкелді, кейін ${gone} шар жарылды.`,
      en: `${a} balloons were brought to the toi and ${b} more, then ${gone} popped.` },
    q1: { ru: 'Сколько принесли всего?', kk: 'Барлығы қанша әкелді?', en: 'How many were brought?' },
    step1: s1, expr1: `${a} + ${b}`,
    q2: { ru: 'Сколько осталось?', kk: 'Қанша қалды?', en: 'How many are left?' },
    answer: ans, expr2: `${s1} − ${gone}`,
  }
}

function buildOptions(answer: number, lo = 0, hi = 30): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-3, 3)
    if (d >= lo && d <= hi && d !== answer) s.add(d)
  }
  while (s.size < 4) s.add(answer + s.size + 1)
  const arr = [...s].slice(0, 4)
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

export default function Tasks2Trainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [p, setP] = useState<P | null>(null)
  const [phase, setPhase] = useState<1 | 2>(1)
  const [options, setOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  // A miss already shows the step's result, so the offer belongs on the NEXT story.
  const offerNext = useRef(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    setP(prev => {
      const np = gen(prev?.emoji)
      setPhase(1); setOptions(buildOptions(np.step1)); setPicked(null); setStatus('idle')
      setHint(false); setOffer(offerNext.current); offerNext.current = false
      return np
    })
  }
  useEffect(() => { newProblem() }, [])

  const bankXp = async (amt: number) => {
    if (amt <= 0) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
    await supabase.from('profiles').update({ xp: (data?.xp ?? 0) + amt }).eq('id', user.id)
    void touchStreak(supabase)
  }
  const rnd = useRound(bankXp)

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g2_tasks2', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pick = (opt: number) => {
    if (status !== 'idle' || !p) return
    playTap(); setPicked(opt)
    const target = phase === 1 ? p.step1 : p.answer
    if (opt === target) {
      setStatus('right'); playCorrect()
      if (phase === 1) {
        setTimeout(() => {
          setPhase(2); setStatus('idle'); setPicked(null); setOptions(buildOptions(p.answer))
          setHint(false); setOffer(false)   // second step is a new question — start clean
        }, 900)
      } else {
        setCorrect(c => c + 1)
        setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
        setTimeout(() => finishProblem(true), 1100)
      }
    } else {
      setStatus('wrong'); setStreak(0); playWrong(); offerNext.current = true
    }
  }

  const stop = () => { rnd.bankPartial(); setEnded(true) }
  const restart = () => {
    setCorrect(0); setTotal(0); setStreak(0); setBest(0); setEnded(false)
    rnd.resetRound(); newProblem()
  }

  if (rnd.milestone) {
    return <RoundMilestone lang={lang} roundCorrect={rnd.roundCorrect} streak={streak}
      onContinue={() => rnd.continueRound(newProblem)} onFinish={() => { rnd.setMilestone(false); setEnded(true) }} />
  }

  if (ended) {
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🧩'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_tasks2_title', lang)}</h2>
        <p className="text-muted-foreground mb-1 tabular">{correct} / {total} · {pct}%</p>
        <p className="font-black tabular mb-1" style={{ color: 'var(--warning)' }}>🔥 {t('train_best', lang)}: {best}</p>
        <p className="font-black text-xl mb-10 tabular" style={{ color: 'var(--primary)' }}>+{correct * 2} XP</p>
        <div className="flex gap-3 w-full max-w-xs">
          <button onClick={() => router.push('/train')}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] font-display font-black"
            style={{ background: 'var(--card)', color: 'var(--foreground)', ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
            {t('game_home', lang)}
          </button>
          <button onClick={restart}
            className="pop-btn flex-1 py-3.5 rounded-[var(--radius)] text-white font-display font-black"
            style={{ background: 'var(--gradient-hero)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('game_again', lang)}
          </button>
        </div>
      </div>
    )
  }

  if (!p) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const curExpr = phase === 1 ? p.expr1 : p.expr2
  const curTarget = phase === 1 ? p.step1 : p.answer

  // The two operands of the CURRENT step, pulled back out of the expression the
  // generator wrote (`12 − 5`). If it ever stops looking like that, the chain
  // quietly falls back to the single closing question rather than lying.
  const operands = curExpr.match(/^(\d+)\s*[+−×]\s*(\d+)$/)
  const hintSteps: HintStep[] = [
    ...(operands ? [
      { ask: t('hint_t2_first', lang), answer: Number(operands[1]), lo: 0, hi: 30 },
      { ask: t('hint_t2_second', lang), answer: Number(operands[2]), lo: 0, hi: 30 },
    ] : []),
    { ask: t('hint_t2_result', lang), expr: curExpr, answer: curTarget, lo: 0, hi: 30 },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🧩 {t('train_tasks2_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        <div className="bg-card rounded-3xl px-5 py-6 shadow-[var(--shadow-md)] flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">{p.emoji}</span>
          <p className="text-base font-bold text-foreground leading-relaxed">{p.story[lang]}</p>

          {/* Two step chips — step 1 fills once solved, so the child sees the plan */}
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2.5 py-1 rounded-full text-xs font-black tabular-nums"
              style={{ background: phase === 1 ? 'color-mix(in oklch, var(--primary) 14%, var(--card))' : 'color-mix(in oklch, var(--success) 16%, var(--card))',
                color: phase === 1 ? 'var(--primary)' : 'var(--success)' }}>
              {p.expr1} = {phase === 1 ? '?' : p.step1}
            </span>
            <ArrowRight size={16} className="text-muted-foreground" />
            <span className="px-2.5 py-1 rounded-full text-xs font-black tabular-nums"
              style={{ background: phase === 2 ? 'color-mix(in oklch, var(--primary) 14%, var(--card))' : 'var(--muted)',
                color: phase === 2 ? 'var(--primary)' : 'var(--muted-foreground)' }}>
              {phase === 2 ? p.expr2 : '…'} {phase === 2 ? '= ?' : ''}
            </span>
          </div>
        </div>

        <p className="text-sm font-bold text-muted-foreground text-center">
          {(phase === 1 ? p.q1 : p.q2)[lang]}
          <span className="ml-2 font-display font-black text-foreground">{curExpr} = ?</span>
        </p>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t(phase === 1 ? 'hint_t2_step1_rule' : 'hint_t2_step2_rule', lang)}
            steps={hintSteps} />
        )}

        <div className="grid grid-cols-2 gap-3">
          {options.map(opt => {
            const isAns = opt === curTarget
            const isPicked = picked === opt
            let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
            if (status !== 'idle') {
              if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
              else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
            }
            return (
              <button key={opt} onClick={() => pick(opt)} disabled={status !== 'idle'}
                className={`pop-btn rounded-[var(--radius)] py-5 border-2 font-display font-black text-3xl tabular ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                style={{ background: bg, borderColor: bd, color: col, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                {opt}
              </button>
            )
          })}
        </div>

        {status === 'wrong' && (
          <button onClick={() => finishProblem(false)}
            className="pop-btn w-full font-display text-white font-black text-xl rounded-[var(--radius)] py-4 flex items-center justify-center gap-2"
            style={{ background: 'var(--primary)', ['--pop-shadow' as string]: 'var(--primary-deep)' } as CSSProperties}>
            {t('next', lang)} <ArrowRight size={20} />
          </button>
        )}

        {!hint && status === 'idle' && <HintButton lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
      </main>

      <div className="px-4 pb-8 pt-4 max-w-md mx-auto w-full">
        <button onClick={stop}
          className="w-full py-3.5 rounded-[var(--radius)] font-display font-black flex items-center justify-center gap-2 border-2"
          style={{ background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
          <Square size={15} fill="currentColor" /> {t('train_stop', lang)}
        </button>
      </div>
    </div>
  )
}
