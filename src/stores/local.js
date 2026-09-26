import { defineStore } from 'pinia'
import { LocalStorage } from 'quasar'

const get = (k, def) => { const v = LocalStorage.getItem('as.' + k); return v == null ? def : v }
const set = (k, v) => LocalStorage.set('as.' + k, v)

/** Edits made in this browser until the backend persists them:
 *  owner overrides, task state, notes, thresholds, audit trail, cron runs. */
export const useLocalStore = defineStore('local', {
  state: () => ({
    owners: get('owners', {}),        // accountId -> repId | null
    tasks: get('tasks', {}),          // taskId -> { status, snoozeDays, outcome, at, ... }
    notes: get('notes', {}),          // accountId -> [{ at, who, kind, text, outcome, next }]
    audit: get('audit', []),          // [{ at, who, action }]
    thresholds: get('thresholds', null),
    cronRuns: get('cronRuns', {}),
    aiFeedback: get('aiFeedback', {}),
  }),
  actions: {
    setOwners(ids, rep) { ids.forEach((id) => { this.owners[id] = rep }); set('owners', this.owners) },
    setTask(id, patch) {
      if (patch === null) delete this.tasks[id]
      else this.tasks[id] = Object.assign({}, this.tasks[id] || {}, patch, { at: Date.now() })
      set('tasks', this.tasks)
    },
    addNote(accountId, note) {
      ;(this.notes[accountId] = this.notes[accountId] || []).unshift(Object.assign({ at: Date.now() }, note))
      set('notes', this.notes)
    },
    removeNote(accountId, text) { if (this.notes[accountId]) { this.notes[accountId] = this.notes[accountId].filter((x) => x.text !== text); set('notes', this.notes) } },
    logAudit(who, action) { this.audit.unshift({ at: Date.now(), who, action }); this.audit = this.audit.slice(0, 200); set('audit', this.audit) },
    setThresholds(v) { this.thresholds = v; set('thresholds', v) },
    setCronRun(key, v) { this.cronRuns[key] = v; set('cronRuns', this.cronRuns) },
    setAiFeedback(k, v) { this.aiFeedback[k] = v; set('aiFeedback', this.aiFeedback) },
  },
})
