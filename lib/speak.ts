// Most devices (esp. Apple) ship no Kazakh voice, so we fall back to a Russian
// voice. The Russian voice garbles or drops the Kazakh-specific letters, so when
// we DON'T have a real kk voice we approximate those glyphs to the nearest
// Russian-readable ones. Intelligible, not perfect — a real fix needs recorded
// or cloud (kk-KZ) audio.
const KZ_APPROX: Record<string, string> = {
  'ә': 'а', 'Ә': 'А', 'ө': 'о', 'Ө': 'О', 'ұ': 'у', 'Ұ': 'У', 'ү': 'у', 'Ү': 'У',
  'і': 'и', 'І': 'И', 'қ': 'к', 'Қ': 'К', 'ғ': 'г', 'Ғ': 'Г', 'ң': 'нг', 'Ң': 'Нг',
  'һ': 'х', 'Һ': 'Х',
}
const ruApprox = (s: string) => s.replace(/[әӘөӨұҰүҮіІқҚғҒңҢһҺ]/g, c => KZ_APPROX[c] ?? c)

// Speak Kazakh text. Robust against missing kk voices and the iOS quirk where
// deferring the call (waiting for onvoiceschanged) loses the user gesture.
export function speak(text: string, lang = 'kk-KZ') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const synth = window.speechSynthesis

  const utter = () => {
    try { synth.cancel() } catch { /* ignore */ }
    const voices = synth.getVoices()
    // Prefer a real Kazakh voice; otherwise fall back to a Russian one.
    const kk = voices.find(v => v.lang?.toLowerCase().startsWith('kk'))
    const pick = kk ?? voices.find(v => v.lang?.toLowerCase().startsWith('ru')) ?? null
    // With a kk voice, read as-is; without, approximate the special letters.
    const u = new SpeechSynthesisUtterance(kk ? text : ruApprox(text))
    u.rate = 0.85
    if (pick) { u.voice = pick; u.lang = pick.lang } else { u.lang = lang }
    synth.speak(u)
    // Chrome occasionally leaves the queue paused
    try { if (synth.paused) synth.resume() } catch { /* ignore */ }
  }

  // Speak synchronously within the click (don't defer — that breaks iOS).
  // If voices aren't loaded yet, kick a load and retry shortly, but also
  // attempt the default voice immediately.
  if (synth.getVoices().length === 0) {
    synth.onvoiceschanged = () => { synth.onvoiceschanged = null; utter() }
  }
  utter()
}
