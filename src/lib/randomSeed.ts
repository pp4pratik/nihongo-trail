// A fresh, non-deterministic seed for starting a brand-new session. Once a
// session exists, its RNG-derived exercise list is stored on the Session
// object itself and never regenerated (§10.4) — this seed is only ever
// used once, at session creation.
export function randomSeed(): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0]
}
