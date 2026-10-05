/* Writes the backend has no endpoint for yet: notes, tasks, thresholds, AI feedback, audit.
   They live in this browser (stores/local) exactly as in mock mode, so pages behave the same. */
import { useLocalStore } from 'stores/local'
import { useSessionStore } from 'stores/session'
import { fa } from 'src/lib/format'
import { post } from './client'
import { clearCaches } from './account'

const local = () => useLocalStore()
const whoName = () => (useSessionStore().user && useSessionStore().user.name) || 'مدیر'
const ok = (v) => Promise.resolve(v)

export function addNote(accountId, note) { local().addNote(accountId, Object.assign({ who: whoName() }, note)); return ok(true) }
export function removeNote(accountId, text) { local().removeNote(accountId, text); return ok(true) }
export function setTask(id, patch) { local().setTask(id, patch); return ok(true) }
export function logAudit(action) { local().logAudit(whoName(), action); return ok(true) }
export function setThresholds(v, changed) {
  local().setThresholds(v)
  local().logAudit(whoName(), v === null ? 'بازگشت آستانه‌ها به پیش‌فرض' : 'تغییر آستانه‌ها' + (changed ? ' (' + fa(changed) + ' مقدار متفاوت با پیش‌فرض)' : ''))
  return ok(true)
}
export function setAiFeedback(k, v) { local().setAiFeedback(k, v); return ok(true) }
/** The only cron the server lets us trigger is the management sync (POST /management/sync). */
export async function runCron(key) {
  if (key !== 'management-nightly') throw new Error('اجرای دستی این کران از پنل ممکن نیست')
  local().logAudit(whoName(), 'اجرای دوبارهٔ کران «همگام‌سازی پنل مدیریت»')
  const r = await post('/sync', {})
  clearCaches()
  return r
}
export function cancelCron(key) { local().setCronRun(key, null); return ok(true) }
export function undoQuotaOffer(id, text) { local().removeNote(id, text); return ok(true) }
