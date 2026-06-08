// Speak Kazakh text. Robust against missing kk voices and the iOS quirk where
// deferring the call (waiting for onvoiceschanged) loses the user gesture.
export function speak(text: string, lang = 'kk-KZ') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const synth = window.speechSynthesis

  const utter = () => {
    try { synth.cancel() } catch { /* ignore */ }
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.85
    const voices = synth.getVoices()
    // Prefer a Kazakh voice; fall back to Russian (also reads Cyrillic).
    const pick =
      voices.find(v => v.lang?.toLowerCase().startsWith('kk')) ??
      voices.find(v => v.lang?.toLowerCase().startsWith('ru')) ??
      null
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
