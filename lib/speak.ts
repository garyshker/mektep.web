export function speak(text: string, lang = 'kk-KZ') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.8

  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices()
    const kk = voices.find(v => v.lang.startsWith('kk'))
    const ru = voices.find(v => v.lang.startsWith('ru'))
    if (kk) u.voice = kk
    else if (ru) { u.voice = ru; u.lang = 'ru-RU' }
    window.speechSynthesis.speak(u)
  }

  // Voices may not be loaded yet on first call
  if (window.speechSynthesis.getVoices().length > 0) {
    trySpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => { trySpeak() }
  }
}
