/**
 * Synthesized auction sound effects (Web Audio API) — no audio files to license or load.
 * Browsers only allow audio after a user gesture, so screens offer a sound toggle; turning it
 * on calls `unlock()` from that click.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null

function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.7
    // Gentle compression keeps cheers and gavel hits from clipping on venue speakers.
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function unlock() {
  audio()
}

export function setVolume(v: number) {
  audio()
  if (master) master.gain.value = Math.max(0, Math.min(1, v))
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  return src
}

function env(c: AudioContext, start: number, peak: number, attack: number, decay: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay)
  return g
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', peak = 0.2, glideTo?: number) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime + at
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur)
  const g = env(c, t, peak, 0.005, dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function burst(at: number, dur: number, filter: BiquadFilterType, freq: number, peak = 0.3, q = 1, sweepTo?: number) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime + at
  const src = noise(c)
  const f = c.createBiquadFilter()
  f.type = filter
  f.frequency.setValueAtTime(freq, t)
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur)
  f.Q.value = q
  const g = env(c, t, peak, Math.min(0.02, dur / 4), dur)
  src.connect(f).connect(g).connect(master)
  src.start(t, Math.random())
  src.stop(t + dur + 0.05)
}

/** Crowd roar: band-passed noise with a slow swell and flutter. */
function crowd(at: number, dur: number, peak: number) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime + at
  for (const [freq, q] of [[900, 0.8], [1800, 1.2], [3200, 1.5]] as const) {
    const src = noise(c)
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    f.Q.value = q
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const lfo = c.createOscillator()
    const lfoGain = c.createGain()
    lfo.frequency.value = 5 + Math.random() * 4
    lfoGain.gain.value = peak * 0.35
    lfo.connect(lfoGain).connect(g.gain)
    src.connect(f).connect(g).connect(master)
    src.start(t, Math.random())
    lfo.start(t)
    src.stop(t + dur + 0.1)
    lfo.stop(t + dur + 0.1)
  }
}

export const sfx = {
  /** New bid: bright double ping. */
  bid() {
    tone(1318, 0, 0.09, 'triangle', 0.16)
    tone(1760, 0.07, 0.14, 'triangle', 0.14)
  },
  /** Countdown tick; `urgent` for the final second. */
  tick(urgent = false) {
    burst(0, 0.03, 'bandpass', urgent ? 2400 : 1600, 0.35, 6)
    tone(urgent ? 1100 : 820, 0, 0.05, 'square', 0.05)
  },
  /** The hammer: wooden crack + low thump. */
  gavel() {
    burst(0, 0.05, 'bandpass', 2200, 0.9, 2)
    tone(140, 0, 0.3, 'sine', 0.6, 45)
  },
  /** Sold: gavel, fanfare and crowd. `big` for record-breaking buys. */
  sold(big = false) {
    this.gavel()
    const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784, 1047]
    notes.forEach((n, i) => {
      tone(n, 0.18 + i * 0.09, 0.45, 'sawtooth', 0.05)
      tone(n, 0.18 + i * 0.09, 0.5, 'triangle', 0.1)
    })
    crowd(0.15, big ? 3.2 : 2, big ? 0.22 : 0.12)
  },
  /** Unsold: sad trombone-ish slide. */
  unsold() {
    tone(330, 0, 0.35, 'sawtooth', 0.07, 290)
    tone(277, 0.38, 0.6, 'sawtooth', 0.07, 200)
  },
  pause() {
    tone(660, 0, 0.12, 'sine', 0.1)
    tone(440, 0.12, 0.2, 'sine', 0.1)
  },
  /** Role-flavoured entrance cue when a new player comes up. */
  intro(role: string) {
    const r = role.toLowerCase()
    if (r.includes('keep')) {
      // gloves: soft thud + snap of the catch
      burst(0, 0.12, 'lowpass', 400, 0.7)
      tone(95, 0, 0.18, 'sine', 0.4, 60)
      burst(0.22, 0.04, 'highpass', 3000, 0.25)
      tone(880, 0.3, 0.25, 'triangle', 0.1)
    } else if (r.includes('all')) {
      // bat crack, then a delivery whoosh and a rising flourish
      burst(0, 0.035, 'highpass', 1800, 0.8)
      tone(1900, 0, 0.12, 'sine', 0.12)
      burst(0.15, 0.4, 'bandpass', 500, 0.3, 2, 3500)
      ;[523, 784, 1047].forEach((n, i) => tone(n, 0.45 + i * 0.07, 0.25, 'triangle', 0.1))
    } else if (r.includes('bowl')) {
      // run-up whoosh, then stumps clattering
      burst(0, 0.5, 'bandpass', 300, 0.35, 2, 4000)
      ;[0.52, 0.57, 0.63].forEach((d) => burst(d, 0.05, 'bandpass', 1500 + Math.random() * 1500, 0.5, 4))
      tone(220, 0.52, 0.2, 'triangle', 0.1, 120)
    } else {
      // batsman: willow crack + ball ping + a little crowd
      burst(0, 0.035, 'highpass', 1800, 0.9)
      tone(2100, 0, 0.18, 'sine', 0.14, 1600)
      crowd(0.08, 1.1, 0.06)
    }
  },
}
