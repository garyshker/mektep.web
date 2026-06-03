let ctx: AudioContext | null = null

const SOUND_KEY = 'mektep_sound'

export function soundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(SOUND_KEY) !== 'off'
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  window.dispatchEvent(new StorageEvent('storage', { key: SOUND_KEY, newValue: on ? 'on' : 'off' }))
}

function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  return ctx
}

function tone(freq: number, type: OscillatorType, start: number, dur: number, vol = 0.25) {
  const c = ac()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(vol, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
  osc.start(start)
  osc.stop(start + dur + 0.01)
}

export function playCorrect() {
  if (!soundEnabled()) return
  try {
    const c = ac()
    const now = c.currentTime
    // C5 → E5 → G5 arpeggio
    tone(523, 'sine', now,        0.25, 0.22)
    tone(659, 'sine', now + 0.09, 0.25, 0.22)
    tone(784, 'sine', now + 0.18, 0.35, 0.22)
  } catch { /* ignore if audio blocked */ }
}

export function playWrong() {
  if (!soundEnabled()) return
  try {
    const c = ac()
    const now = c.currentTime
    // descending buzz
    tone(280, 'sawtooth', now,       0.18, 0.18)
    tone(200, 'sawtooth', now + 0.16, 0.22, 0.14)
  } catch { /* ignore */ }
}

export function playTap() {
  if (!soundEnabled()) return
  try {
    const c = ac()
    const now = c.currentTime
    tone(1000, 'sine', now, 0.05, 0.08)
  } catch { /* ignore */ }
}
