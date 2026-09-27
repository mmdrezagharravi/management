/* Small presentational helpers shared by components: delta text, health band, toast. */
import { Notify } from "quasar"
import { n, nfx } from './format'

export const BANDS = [
  { min: 70, key: 'good', label: 'سالم' },
  { min: 50, key: 'warn', label: 'نیاز به توجه' },
  { min: 30, key: 'ser', label: 'در خطر' },
  { min: 0, key: 'crit', label: 'بحرانی' },
]
export const band = (score) => BANDS.find((b) => score >= b.min)
export const BAND_COLOR = { good: 'var(--good)', warn: 'var(--warning)', ser: 'var(--serious)', crit: 'var(--critical)' }
export const STATUS_COLOR = { ...BAND_COLOR, info: 'var(--accent)' }
export const PLAN_NAME = { basic: 'پایه', team: 'تیم', business: 'کسب و کار', enterprise: 'سازمانی', partner: 'شریک توسعه' }

/** Compare cur vs prev → { cls: 'good'|'bad'|'flat', arrow, text } or null. */
export function delta(cur, prev, o = {}) {
  if (prev == null || cur == null) return null
  let ch, txt
  if (o.abs) { ch = cur - prev; txt = o.fmt ? o.fmt(Math.abs(ch)) : n(Math.abs(ch)) }
  else if (o.points) { ch = cur - prev; txt = nfx(1).format(Math.abs(ch * 100)) + ' واحد' }
  else { if (!prev) return null; ch = (cur - prev) / Math.abs(prev); txt = nfx(Math.abs(ch) < 0.1 ? 1 : 0).format(Math.abs(ch * 100)) + '٪' }
  const flat = Math.abs(ch) < (o.flat || 0.005) && !(o.abs && ch !== 0)
  if (flat && (o.abs || o.points)) return { cls: 'flat', arrow: '•', text: 'بدون تغییر' }
  const goodUp = o.goodUp !== false
  const cls = flat ? 'flat' : (ch > 0) === goodUp ? 'good' : 'bad'
  return { cls, arrow: flat ? '•' : ch > 0 ? '▲' : '▼', text: txt }
}

export function toast(message, undo) {
  Notify.create({
    message, classes: 'app-toast', group: false,
    actions: undo ? [{ label: 'بازگردانی', color: 'blue-3', handler: undo }] : undefined,
  })
}
