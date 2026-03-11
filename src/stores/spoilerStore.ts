import { create } from "zustand"
import { persist } from "zustand/middleware"

interface SpoilerStore {
  hideSpoilers: boolean
  toggleSpoilers: () => void
}

export const useSpoilerStore = create<SpoilerStore>()(
  persist(
    (set) => ({
      hideSpoilers: true,
      toggleSpoilers: () => set((s) => ({ hideSpoilers: !s.hideSpoilers })),
    }),
    { name: "highscore-spoiler-pref" }
  )
)
