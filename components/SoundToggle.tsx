'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { soundEnabled, setSoundEnabled } from '@/lib/sounds'

export function SoundToggle() {
  const [on, setOn] = useState(true)
  useEffect(() => { setOn(soundEnabled()) }, [])

  const toggle = () => { const v = !on; setOn(v); setSoundEnabled(v) }

  return (
    <button onClick={toggle} aria-label="Sound"
      className="relative w-14 h-8 rounded-full transition-colors shrink-0"
      style={{ background: on ? 'var(--primary)' : 'var(--border)' }}>
      <span className="absolute top-1 left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-transform shadow-sm"
        style={{ transform: on ? 'translateX(24px)' : 'translateX(0)' }}>
        {on
          ? <Volume2 size={13} style={{ color: 'var(--primary)' }} />
          : <VolumeX size={13} className="text-muted-foreground" />}
      </span>
    </button>
  )
}
