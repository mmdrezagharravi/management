import { onMounted, onUnmounted } from 'vue'

/** Global keyboard layer: Ctrl+K and "/" open the palette, "?" the shortcut help,
 *  j/k/Enter drive whichever list registered itself with ui.setListNav. */
export function useHotkeys(ui) {
  const handler = (ev) => {
    const typing = ev.target && ev.target.closest ? ev.target.closest('input, textarea, select, [contenteditable]') : null
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); ui.openPalette(); return }
    if (ev.key === 'Escape') return
    if (typing || ev.ctrlKey || ev.metaKey || ev.altKey || document.querySelector('.q-dialog')) return
    if (ev.key === '/') { ev.preventDefault(); ui.openPalette(); return }
    if (ev.key === '?') { ui.shortcutsOpen = true; return }
    const nav = ui.listNav
    if (!nav) return
    if (ev.key === 'j' || (ev.key === 'ArrowDown' && ev.shiftKey)) { nav.move(1); ev.preventDefault() }
    else if (ev.key === 'k' || (ev.key === 'ArrowUp' && ev.shiftKey)) { nav.move(-1); ev.preventDefault() }
    else if (ev.key === 'Enter' && nav.open) nav.open()
    else if (nav.act) nav.act(ev.key, ev)
  }
  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
