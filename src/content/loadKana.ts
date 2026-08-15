// Content loading (§13.4): kana.json is always loaded eagerly, fetched
// (not imported as a module) so the service worker's stale-while-revalidate
// caching (§13.5) applies to it in production, same as every other content
// shard.

import type { KanaItem } from '@/types'

export interface KanaContent {
  items: KanaItem[]
}

export async function loadKanaContent(): Promise<KanaContent> {
  const res = await fetch('/content/kana.json')
  if (!res.ok) {
    throw new Error(`Failed to load kana content: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<KanaContent>
}

export function findKanaItem(content: KanaContent, id: string): KanaItem | undefined {
  return content.items.find((item) => item.id === id)
}
