import { h, render } from 'vue'
import LogCallDialog from 'src/components/dialogs/LogCallDialog.vue'
import NoteDialog from 'src/components/dialogs/NoteDialog.vue'

/** Mount a one-off dialog component outside the page tree; resolves when it closes. */
function mountDialog(comp, props, appContext) {
  return new Promise((resolve) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let saved = false
    const vnode = h(comp, { ...props, onSaved: () => { saved = true }, onClosed: () => { setTimeout(() => { render(null, host); host.remove() }, 300); resolve(saved) } })
    vnode.appContext = appContext
    render(vnode, host)
  })
}
export function useDialogs() {
  const ctx = getContext()
  return {
    logCall: (account, taskId) => mountDialog(LogCallDialog, { account, taskId }, ctx),
    addNote: (account) => mountDialog(NoteDialog, { account }, ctx),
  }
}
let appCtx = null
export const setAppContext = (c) => { appCtx = c }
const getContext = () => appCtx
