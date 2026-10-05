/* GET /management/segments → the shape mock/segments.js returns; members come from customersPage({ segment }). */
import { get } from './client'
import { SEGMENT_LABEL } from 'src/lib/refs'
import { BANDS } from 'src/lib/ui'

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
  const r = await get('/segments')
  const label = (key) => SEGMENT_LABEL[key] || key
  const bandLabel = Object.fromEntries(BANDS.map((b) => [b.key, b.label]))
  return {
    ...r,
    segs: r.segs.map((s) => ({ ...s, label: label(s.key), ...(META[s.key] || { rule: '', desc: '' }), dist: s.dist.map((b) => ({ ...b, label: bandLabel[b.key] })) })),
    top: r.top && { r: { key: r.top.r, label: label(r.top.r) }, c: { key: r.top.c, label: label(r.top.c) }, v: r.top.v },
  }
}
