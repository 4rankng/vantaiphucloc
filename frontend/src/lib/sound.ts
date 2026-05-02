let audioCtx: AudioContext | null = null

export function playTick() {
  if (typeof window === 'undefined') return
  try {
    if (!audioCtx) audioCtx = new AudioContext()

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = 'sine'
    osc.frequency.value = 800
    gain.gain.value = 0.15

    osc.connect(gain)
    gain.connect(audioCtx.destination)

    const now = audioCtx.currentTime
    osc.start(now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
    osc.stop(now + 0.08)
  } catch {
    // AudioContext may not be available
  }
}
