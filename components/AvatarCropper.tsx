'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent } from 'react'
import { useLang } from '@/lib/useLang'
import { t } from '@/lib/i18n'
import { ZoomIn } from 'lucide-react'

const VIEW = 264 // crop viewport, px (square)
const OUT = 512  // exported image size, px

type Off = { x: number; y: number }

// Square/circle photo cropper. Drag to pan, slider to zoom, exports a
// center-cropped JPEG blob sized OUT×OUT.
export function AvatarCropper({ file, onCancel, onConfirm }: {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}) {
  const lang = useLang()
  const [url] = useState(() => URL.createObjectURL(file))
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  const imgRef = useRef<HTMLImageElement | null>(null)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [minScale, setMinScale] = useState(1)
  const [scale, setScale] = useState(1)
  const [off, setOff] = useState<Off>({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const clamp = (o: Off, s: number, n = nat): Off => {
    if (!n) return o
    const minX = VIEW - n.w * s, minY = VIEW - n.h * s
    return { x: Math.min(0, Math.max(minX, o.x)), y: Math.min(0, Math.max(minY, o.y)) }
  }

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const w = e.currentTarget.naturalWidth, h = e.currentTarget.naturalHeight
    const ms = Math.max(VIEW / w, VIEW / h) // "cover" the square
    const n = { w, h }
    setNat(n); setMinScale(ms); setScale(ms)
    setOff(clamp({ x: (VIEW - w * ms) / 2, y: (VIEW - h * ms) / 2 }, ms, n))
  }

  const zoomTo = (s: number) => {
    setOff(prev => {
      const c = VIEW / 2
      const sx = (c - prev.x) / scale, sy = (c - prev.y) / scale // keep center fixed
      return clamp({ x: c - sx * s, y: c - sy * s }, s)
    })
    setScale(s)
  }

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: off.x, oy: off.y }
  }
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y
    setOff(clamp({ x: drag.current.ox + dx, y: drag.current.oy + dy }, scale))
  }
  const onUp = () => { drag.current = null }

  const confirm = () => {
    if (!nat || !imgRef.current || busy) return
    setBusy(true)
    const canvas = document.createElement('canvas')
    canvas.width = OUT; canvas.height = OUT
    const ctx = canvas.getContext('2d')
    if (!ctx) { setBusy(false); return }
    const sSize = VIEW / scale
    ctx.drawImage(imgRef.current, -off.x / scale, -off.y / scale, sSize, sSize, 0, 0, OUT, OUT)
    canvas.toBlob(b => { if (b) onConfirm(b); else setBusy(false) }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-card rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] w-full max-w-xs p-5 flex flex-col items-center gap-4 animate-mk-pop-in">
        <p className="font-display font-black text-foreground text-lg">{t('crop_title', lang)}</p>

        <div
          className="relative overflow-hidden rounded-full touch-none select-none cursor-grab active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW, background: 'var(--muted)', boxShadow: 'inset 0 0 0 3px color-mix(in oklch, var(--primary) 30%, transparent)' }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef} src={url} alt="" onLoad={onImgLoad} draggable={false}
            style={{
              position: 'absolute', left: off.x, top: off.y,
              width: nat ? nat.w * scale : 'auto', height: nat ? nat.h * scale : 'auto',
              maxWidth: 'none', pointerEvents: 'none',
            }} />
        </div>

        <p className="text-xs text-muted-foreground -mt-1">{t('crop_hint', lang)}</p>

        <div className="flex items-center gap-3 w-full px-1">
          <ZoomIn size={18} className="text-muted-foreground shrink-0" />
          <input
            type="range" min={minScale} max={minScale * 4} step={0.01} value={scale}
            onChange={e => zoomTo(parseFloat(e.target.value))}
            className="flex-1 accent-[var(--primary)]" aria-label={t('crop_hint', lang)} />
        </div>

        <div className="flex gap-3 w-full">
          <button onClick={onCancel} disabled={busy}
            className="flex-1 py-3 rounded-[var(--radius)] font-display font-black text-sm border-2 disabled:opacity-50"
            style={{ background: 'var(--card)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
            {t('btn_cancel', lang)}
          </button>
          <button onClick={confirm} disabled={busy || !nat}
            className="flex-1 py-3 rounded-[var(--radius)] font-display font-black text-sm text-white active:scale-95 transition-transform disabled:opacity-50"
            style={{ background: 'var(--primary)' }}>
            {busy
              ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : t('btn_save', lang)}
          </button>
        </div>
      </div>
    </div>
  )
}
