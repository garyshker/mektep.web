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

// Grade-1 step 8: one-step word problems with Kazakh-flavoured stories.
// Two guided phases: (1) CHOOSE the operation — understanding the story
// structure is the skill — then (2) work out the answer. Numbers within 10.
const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1))

// Russian numeral agreement: 2 яблока / 5 яблок (all our numbers are >= 2).
const rp = (n: number, f: [string, string, string]) =>
  n % 10 === 1 && n % 100 !== 11 ? f[0]
  : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? f[1]
  : f[2]

type Story = { kk: string; ru: string; en: string }
type Tmpl = { emoji: string; op: '+' | '−'; text: (a: number, b: number) => Story }

const TEMPLATES: Tmpl[] = [
  { emoji: '🥯', op: '+', text: (a, b) => ({
    ru: `Мама испекла ${a} ${rp(a, ['баурсак', 'баурсака', 'баурсаков'])}, а бабушка ещё ${b}. Сколько всего?`,
    kk: `Анам ${a} бауырсақ пісірді, ал әжем тағы ${b} пісірді. Барлығы қанша?`,
    en: `Mom baked ${a} baursaks, and grandma baked ${b} more. How many in total?` }) },
  { emoji: '🐑', op: '+', text: (a, b) => ({
    ru: `На жайлау было ${a} ${rp(a, ['овца', 'овцы', 'овец'])}, пришли ещё ${b}. Сколько стало?`,
    kk: `Жайлауда ${a} қой болды, тағы ${b} қой келді. Барлығы қанша болды?`,
    en: `There were ${a} sheep in the pasture, ${b} more came. How many now?` }) },
  { emoji: '🎈', op: '+', text: (a, b) => ({
    ru: `На той принесли ${a} ${rp(a, ['шарик', 'шарика', 'шариков'])}, потом ещё ${b}. Сколько всего?`,
    kk: `Тойға ${a} шар әкелді, кейін тағы ${b} шар әкелді. Барлығы қанша?`,
    en: `${a} balloons were brought to the toi, then ${b} more. How many in total?` }) },
  { emoji: '🍎', op: '+', text: (a, b) => ({
    ru: `У Айгерим ${a} ${rp(a, ['яблоко', 'яблока', 'яблок'])}, Болат дал ещё ${b}. Сколько стало?`,
    kk: `Айгерімде ${a} алма бар, Болат тағы ${b} алма берді. Қанша болды?`,
    en: `Aigerim has ${a} apples, Bolat gave her ${b} more. How many now?` }) },
  { emoji: '🥯', op: '−', text: (a, b) => ({
    ru: `Было ${a} ${rp(a, ['баурсак', 'баурсака', 'баурсаков'])}, дети съели ${b}. Сколько осталось?`,
    kk: `${a} бауырсақ бар еді, балалар ${b} бауырсақ жеді. Қанша қалды?`,
    en: `There were ${a} baursaks, the kids ate ${b}. How many are left?` }) },
  { emoji: '🐦', op: '−', text: (a, b) => ({
    ru: `На дереве было ${a} ${rp(a, ['птица', 'птицы', 'птиц'])}, ${b} улетели. Сколько осталось?`,
    kk: `Ағашта ${a} құс отырды, ${b} құс ұшып кетті. Қанша қалды?`,
    en: `${a} birds sat in a tree, ${b} flew away. How many are left?` }) },
  { emoji: '🎈', op: '−', text: (a, b) => ({
    ru: `У Данияра было ${a} ${rp(a, ['шарик', 'шарика', 'шариков'])}, ${b} лопнули. Сколько осталось?`,
    kk: `Даниярда ${a} шар болды, ${b} шар жарылып кетті. Қанша қалды?`,
    en: `Daniyar had ${a} balloons, ${b} popped. How many are left?` }) },
  { emoji: '🐴', op: '−', text: (a, b) => ({
    ru: `В табуне было ${a} ${rp(a, ['лошадь', 'лошади', 'лошадей'])}, ${b} ускакали. Сколько осталось?`,
    kk: `Үйірде ${a} жылқы болды, ${b} жылқы шауып кетті. Қанша қалды?`,
    en: `The herd had ${a} horses, ${b} galloped away. How many are left?` }) },
]

type P = { emoji: string; op: '+' | '−'; a: number; b: number; answer: number; story: Story }

function gen(prevEmoji?: string): P {
  let tmpl = TEMPLATES[ri(0, TEMPLATES.length - 1)]
  if (prevEmoji && TEMPLATES.length > 1) {
    let guard = 0
    while (tmpl.emoji === prevEmoji && guard++ < 10) tmpl = TEMPLATES[ri(0, TEMPLATES.length - 1)]
  }
  if (tmpl.op === '+') {
    const a = ri(2, 8), b = ri(2, Math.min(8, 10 - a))
    return { emoji: tmpl.emoji, op: '+', a, b, answer: a + b, story: tmpl.text(a, b) }
  }
  const a = ri(4, 10), b = ri(2, a - 2)
  return { emoji: tmpl.emoji, op: '−', a, b, answer: a - b, story: tmpl.text(a, b) }
}

function buildNumOptions(answer: number): number[] {
  const s = new Set<number>([answer])
  let guard = 0
  while (s.size < 4 && guard++ < 60) {
    const d = answer + ri(-2, 2)
    if (d >= 0 && d <= 10) s.add(d)
  }
  const arr = [...s]
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr
}

export default function TasksTrainer() {
  const router = useRouter()
  const supabase = createClient()
  const lang = useLang()

  const [problem, setProblem] = useState<P | null>(null)
  const [phase, setPhase] = useState<'op' | 'num'>('op')
  const [opOrder, setOpOrder] = useState<('+' | '−')[]>(['+', '−'])
  const [numOptions, setNumOptions] = useState<number[]>([])
  const [picked, setPicked] = useState<string | null>(null)   // op symbol or number-as-string
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle')
  const [hint, setHint] = useState(false)
  const [offer, setOffer] = useState(false)
  // A miss already prints the whole worked line, so the offer belongs on the
  // NEXT story — before the child guesses again.
  const offerNext = useRef(false)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [ended, setEnded] = useState(false)

  const newProblem = () => {
    setProblem(prev => {
      const p = gen(prev?.emoji)
      setPhase('op'); setOpOrder(Math.random() < 0.5 ? ['+', '−'] : ['−', '+'])
      setNumOptions(buildNumOptions(p.answer))
      setPicked(null); setStatus('idle')
      setHint(false); setOffer(offerNext.current); offerNext.current = false
      return p
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

  const finishProblem = (wasCorrect: boolean) => { setTotal(c => c + 1); void logTrainerAttempt(supabase, 'g1_tasks', wasCorrect); rnd.conclude(wasCorrect, newProblem) }

  const pickOp = (op: '+' | '−') => {
    if (status !== 'idle' || !problem || phase !== 'op') return
    playTap(); setPicked(op)
    if (op === problem.op) {
      setStatus('right'); playCorrect()
      setTimeout(() => {
        setPhase('num'); setStatus('idle'); setPicked(null)
        setHint(false); setOffer(false)   // the question changed — start clean
      }, 800)
    } else {
      setStatus('wrong'); setStreak(0); playWrong(); offerNext.current = true
    }
  }

  const pickNum = (n: number) => {
    if (status !== 'idle' || !problem || phase !== 'num') return
    playTap(); setPicked(String(n))
    if (n === problem.answer) {
      setStatus('right'); setCorrect(c => c + 1)
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns })
      playCorrect()
      setTimeout(() => finishProblem(true), 1100)
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
        <div className="text-6xl mb-4 animate-mk-pop-in">{best >= 15 ? '🥇' : best >= 8 ? '🥈' : '🐑'}</div>
        <h2 className="text-2xl font-display font-black text-foreground mb-1">{t('train_tasks_title', lang)}</h2>
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

  if (!problem) return <div className="min-h-screen" style={{ background: 'var(--background)' }} />

  const expr = (op: '+' | '−') => `${problem.a} ${op} ${problem.b}`

  // Phase 1 must NOT hand over the operation — it only pulls the two numbers out
  // of the story and leaves the child the "more or less at the end?" decision.
  // Phase 2 walks the story: what there was → what changed → what it makes.
  const hintSteps: HintStep[] = phase === 'op'
    ? [
        { ask: t('hint_task_n1', lang), answer: problem.a, lo: 0, hi: 10 },
        { ask: t('hint_task_n2', lang), answer: problem.b, lo: 0, hi: 10 },
      ]
    : [
        { ask: t('hint_task_first', lang), answer: problem.a, lo: 0, hi: 10 },
        { ask: t(problem.op === '+' ? 'hint_task_added' : 'hint_task_taken', lang), answer: problem.b, lo: 0, hi: 10 },
        { ask: t('hint_task_total', lang), expr: expr(problem.op), answer: problem.answer, lo: 0, hi: 10 },
      ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <header className="px-4 pt-5 pb-3 flex items-center gap-3 max-w-md mx-auto w-full">
        <button onClick={() => router.push('/train')} aria-label="Exit"
          className="w-9 h-9 rounded-full bg-card shadow-[var(--shadow-sm)] flex items-center justify-center text-muted-foreground shrink-0">
          <X size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display font-black text-foreground text-base leading-tight">🐑 {t('train_tasks_title', lang)}</h1>
          <p className="text-xs text-muted-foreground tabular">{correct} / {total}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1" style={{ background: 'color-mix(in oklch, var(--warning) 16%, var(--card))' }}>
          <Flame size={16} fill="currentColor" style={{ color: 'var(--warning)' }} />
          <span className="font-black text-xs tabular" style={{ color: 'var(--warning)' }}>{streak}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 pt-2 gap-4 max-w-md mx-auto w-full">
        <RoundDots done={rnd.roundDone} />

        {/* The story */}
        <div className="bg-card rounded-3xl px-5 py-6 shadow-[var(--shadow-md)] flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">{problem.emoji}</span>
          <p className="text-lg font-bold text-foreground leading-relaxed">{problem.story[lang]}</p>
          {phase === 'num' && (
            <p className="font-display font-black text-2xl animate-mk-pop-in tabular-nums">
              {expr(problem.op)}
              <span className="mx-1.5 text-muted-foreground">=</span>
              <span className={status === 'right' ? 'animate-mk-pop' : ''}
                style={{ color: status === 'right' ? 'var(--success)' : 'var(--muted-foreground)' }}>
                {status === 'right' ? problem.answer : '?'}
              </span>
            </p>
          )}
          {status === 'wrong' && (
            <p className="font-semibold text-foreground">
              {expr(problem.op)} = <span className="font-black" style={{ color: 'var(--success)' }}>{problem.answer}</span>
            </p>
          )}
        </div>

        {/* Phase 1: which operation? Phase 2: the answer */}
        <p className="text-xs font-black text-muted-foreground tracking-widest uppercase text-center">
          {phase === 'op' ? t('tasks_op_q', lang) : t('tasks_solve_q', lang)}
        </p>

        {offer && !hint && status === 'idle' && <HintOffer lang={lang} onOpen={() => { setOffer(false); setHint(true) }} />}
        {hint && (
          <HintScaffold lang={lang} onClose={() => setHint(false)}
            principle={t(phase === 'op' ? 'hint_task_op_rule' : 'hint_task_rule', lang)}
            steps={hintSteps} />
        )}
        {phase === 'op' ? (
          <div className="grid grid-cols-2 gap-3">
            {opOrder.map(op => {
              const isAns = op === problem.op
              const isPicked = picked === op
              let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
              if (status !== 'idle') {
                if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
                else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
              }
              return (
                <button key={op} onClick={() => pickOp(op)} disabled={status !== 'idle'}
                  className={`pop-btn rounded-[var(--radius)] py-5 border-2 font-display font-black text-2xl tabular ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                  style={{ background: bg, borderColor: bd, color: col, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                  {expr(op)}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {numOptions.map(opt => {
              const isAns = opt === problem.answer
              const isPicked = picked === String(opt)
              let bg = 'var(--card)', bd = 'var(--border)', col = 'var(--foreground)'
              if (status !== 'idle') {
                if (isAns) { bg = 'color-mix(in oklch, var(--success) 16%, var(--card))'; bd = 'var(--success)'; col = 'var(--success)' }
                else if (isPicked) { bg = 'color-mix(in oklch, var(--destructive) 12%, var(--card))'; bd = 'var(--destructive)'; col = 'var(--destructive)' }
              }
              return (
                <button key={opt} onClick={() => pickNum(opt)} disabled={status !== 'idle'}
                  className={`pop-btn rounded-[var(--radius)] py-4 border-2 font-display font-black text-3xl tabular ${status === 'right' && isAns ? 'animate-mk-pop' : ''}`}
                  style={{ background: bg, borderColor: bd, color: col, ['--pop-shadow' as string]: 'var(--border)' } as CSSProperties}>
                  {opt}
                </button>
              )
            })}
          </div>
        )}

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
