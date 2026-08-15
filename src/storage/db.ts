// Single shared ProgressStore instance for the app. Screens/components
// import from here rather than constructing their own IndexedDbProgressStore
// — there is exactly one IndexedDB database per install.

import { IndexedDbProgressStore } from './IndexedDbProgressStore'

export const progressStore = new IndexedDbProgressStore()
