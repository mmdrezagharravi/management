import { defineStore } from 'pinia'

/** Transient UI state shared across the shell: the quick-view drawer, the palette, list keyboard nav. */
export const useUiStore = defineStore('ui', {
  state: () => ({ drawerId: null, paletteOpen: false, shortcutsOpen: false, listNav: null, refreshTick: 0 }),
  actions: {
    openAccount(id) { this.drawerId = /^\d+$/.test(String(id)) ? +id : String(id) },
    closeAccount() { this.drawerId = null },
    openPalette() { this.paletteOpen = true },
    setListNav(nav) { this.listNav = nav },
    /** Local edits (owner, notes, tasks) changed — pages that show them re-fetch. */
    bump() { this.refreshTick++ },
  },
})
