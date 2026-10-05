/* GET /management/segments + the customer list → the shape mock/segments.js returns. */
import { get } from './client'
import { customersAll } from './account'
import { SEGMENT_LABEL } from 'src/lib/refs'
import { BANDS } from 'src/lib/ui'

const ACTIVE_WINDOW = 7
// rules as cloud-back/src/api/management/metrics.ts SEGMENTS defines them
const META = {
  new: { rule: 'signup_age <= 14', desc: 'در دو هفتهٔ اخیر ثبت‌نام کرده‌اند' },
  stuck: { rule: 'signup_age 3..30 AND activated = false', desc: 'هفتهٔ اولشان تمام شده و فعال نشده‌اند' },
  builders: { rule: 'bases >= 2 AND last_seen <= 30', desc: 'بیش از یک بیس فعال ساخته‌اند' },
  automators: { rule: 'automations >= 1 AND last_seen <= 30', desc: 'دست‌کم یک خودکارسازی ساخته‌اند — چسبنده‌ترین گروه' },
  teams: { rule: 'active_members_7d >= 2', desc: 'بیش از یک نفر در هفتهٔ اخیر کار کرده' },
  upsell: { rule: 'plan = basic AND at_limit AND last_seen <= 14', desc: 'در پلن پایه به سقف خورده‌اند و همین دو هفته فعال بوده‌اند' },
  risk: { rule: 'paying AND health < 50', desc: 'پرداخت‌کننده با امتیاز سلامت زیر ۵۰' },
  champions: { rule: 'paying AND first_payment >= 180d ago AND health >= 80', desc: 'اکنون پرداخت‌کننده، اولین پرداختشان بیش از ۶ ماه پیش و سالم — مرجع معرفی' },
  dormant: { rule: 'signup_age >= 30 AND last_seen > 30', desc: 'دست‌کم یک ماه از ثبت‌نامشان گذشته و یک ماه است فعالیتی نداشته‌اند' },
}

export async function segments() {
  const [srv, accounts] = await Promise.all([get('/segments'), customersAll()])
  const segs = srv.map((s) => ({ key: s.key, label: SEGMENT_LABEL[s.key] || s.key, ...(META[s.key] || { rule: '', desc: '' }), n: s.n, mrr: s.mrr }))
  const members = {}, idSets = {}
  segs.forEach((s) => { members[s.key] = accounts.filter((a) => a.segments.includes(s.key)); idSets[s.key] = new Set(members[s.key].map((a) => a.id)) })
  const isActive = (a) => a.lastSeenDays < ACTIVE_WINDOW

  // overlap: share of row members that are also in the column group
  const cells = segs.map((r) => segs.map((c) => {
    if (!r.n) return null
    if (r.key === c.key) return 1
    let k = 0; for (const id of idSets[r.key]) if (idSets[c.key].has(id)) k++
    return k / r.n
  }))
  let top = null
  segs.forEach((r, i) => segs.forEach((c, j) => {
    if (i === j || r.n < 20 || cells[i][j] == null) return
    if (!top || cells[i][j] > top.v) top = { r: { key: r.key, label: r.label }, c: { key: c.key, label: c.label }, v: cells[i][j] }
  }))

  return {
    totalAccounts: accounts.length, inAny: accounts.filter((a) => a.segments.length).length, activeN: accounts.filter(isActive).length,
    totalMrr: accounts.reduce((t, a) => t + a.mrr, 0), activeWindow: ACTIVE_WINDOW,
    segs: segs.map((s) => {
      const list = members[s.key]
      return {
        ...s,
        active: list.filter(isActive).length,
        dist: BANDS.map((b) => ({ key: b.key, label: b.label, n: list.filter((a) => a.band === b.key).length })),
        avgHealth: list.length ? Math.round(list.reduce((x, a) => x + a.health, 0) / list.length) : 0,
      }
    }),
    cells, top,
    membersBy: members,
  }
}
