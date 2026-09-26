/* ==========================================================================
   UI — shell, formatting and shared components for every page.

   A page is:   UI.page({ id, title, sub, range, sources, actions, render(ctx) })
   ctx = { el (content root), range (7|30|90), me, rerender() }

   Speed features that live here so every page gets them:
   · Ctrl+K / "/"  global search across customers, bases and pages
   · customer quick-view drawer from any row (Esc closes)
   · j / k to move through rows, Enter to open
   · saved views, filters and sort kept in the URL — shareable
   · one-click CSV export of exactly what is on screen
   · task / note / owner changes persist in this browser (localStorage)
   ========================================================================== */
(function (global) {
'use strict';
const DB = global.DB, C = DB.CONFIG;

/* ============================================================= formatting */
const FA = '۰۱۲۳۴۵۶۷۸۹';
const fa = s => String(s).replace(/[0-9]/g, d => FA[+d]);
const NF = {};
const nfx = d => NF[d] || (NF[d] = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: d, minimumFractionDigits: 0 }));
const n = (x, d) => x == null || isNaN(x) ? '—' : nfx(d || 0).format(x);
function compact(x, d) {
  if (x == null || isNaN(x)) return '—';
  const a = Math.abs(x), sgn = x < 0 ? '−' : '';
  if (a >= 1e9) return sgn + nfx(d == null ? 1 : d).format(a / 1e9) + ' میلیارد';
  if (a >= 1e6) return sgn + nfx(d == null ? (a >= 1e8 ? 0 : 1) : d).format(a / 1e6) + ' میلیون';
  if (a >= 1e4) return sgn + nfx(0).format(a / 1e3) + ' هزار';
  return sgn + nfx(0).format(a);
}
function compactParts(x) {
  const a = Math.abs(x || 0);
  if (a >= 1e9) return { num: nfx(1).format(x / 1e9), unit: 'میلیارد' };
  if (a >= 1e6) return { num: nfx(a >= 1e8 ? 0 : 1).format(x / 1e6), unit: 'میلیون' };
  if (a >= 1e4) return { num: nfx(0).format(x / 1e3), unit: 'هزار' };
  return { num: nfx(0).format(x), unit: '' };
}
const money = (x, unit) => compact(x) + (unit === false ? '' : ' ' + C.currency);
const pct = (x, d) => x == null || isNaN(x) ? '—' : nfx(d || 0).format(x * 100) + '٪';
const signedPct = (x, d) => (x > 0 ? '+' : x < 0 ? '−' : '') + nfx(d || 0).format(Math.abs(x * 100)) + '٪';
const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
function date(daysAgo, o) {
  o = o || {};
  const j = DB.jalali(daysAgo);
  const cur = DB.jalali(0);
  const y = o.year === true || (o.year !== false && j.y !== cur.y);
  return fa(j.d) + ' ' + MONTHS[j.m - 1] + (y ? ' ' + fa(j.y) : '');
}
const monthLabel = (mo, withYear) => MONTHS[mo.m - 1] + (withYear ? ' ' + fa(String(mo.y).slice(2)) : '');
function ago(minutes) {
  if (minutes == null) return '—';
  if (minutes < 2) return 'هم‌اکنون';
  if (minutes < 60) return fa(Math.round(minutes)) + ' دقیقه پیش';
  if (minutes < 1440) return fa(Math.round(minutes / 60)) + ' ساعت پیش';
  const d = Math.floor(minutes / 1440);
  if (d === 1) return 'دیروز';
  if (d < 31) return fa(d) + ' روز پیش';
  if (d < 365) return fa(Math.round(d / 30)) + ' ماه پیش';
  return 'بیش از یک سال';
}
const agoDays = d => d === 0 ? 'امروز' : d === 1 ? 'دیروز' : ago(d * 1440);
const inDays = d => d <= 0 ? 'امروز' : d === 1 ? 'فردا' : fa(d) + ' روز دیگر';
const clock = min => fa(String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏ً-ٟ]/g, '').replace(/[۰-۹]/g, d => FA.indexOf(d)).trim();
const initials = name => { const p = String(name).split(' ').filter(Boolean); return (p[1] || p[0] || '?').slice(0, 1); };
const maskMobile = m => fa(m.slice(0, 4) + ' ••• ' + m.slice(-4));

/* ================================================================ storage */
const store = {
  get(k, def) { try { const v = localStorage.getItem('as.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem('as.' + k, JSON.stringify(v)); } catch (e) { /* private mode: the page still works */ } },
};
const theme = store.get('theme', null);
if (theme) document.documentElement.setAttribute('data-theme', theme);

function me() { return store.get('me', { role: 'manager', rep: 'r1' }); }
function ownerOf(a) { const o = store.get('owners', {}); return o[a.id] !== undefined ? o[a.id] : a.owner; }
function setOwner(ids, rep) {
  const o = store.get('owners', {}); ids.forEach(id => { o[id] = rep; }); store.set('owners', o);
  logAudit('تغییر مسئول ' + fa(ids.length) + ' حساب به ' + (rep ? DB.rep(rep).short : 'بدون مسئول'));
}
function taskState(id) { return store.get('tasks', {})[id] || null; }
function setTask(id, patch) { const t = store.get('tasks', {}); t[id] = Object.assign({}, t[id] || {}, patch, { at: Date.now() }); store.set('tasks', t); }
function notes(accId) { return (store.get('notes', {})[accId] || []); }
function addNote(accId, note) { const all = store.get('notes', {}); (all[accId] = all[accId] || []).unshift(Object.assign({ at: Date.now(), who: whoName() }, note)); store.set('notes', all); }
function whoName() { const m = me(); return m.role === 'rep' ? DB.rep(m.rep).name : 'مدیر فروش'; }
function logAudit(action) { const a = store.get('audit', []); a.unshift({ at: Date.now(), who: whoName(), action }); store.set('audit', a.slice(0, 200)); }

/* ================================================================== icons */
const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z"/>',
  sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v3M17.5 4.5h3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2 .8 3.5 2.8 3.5 5.7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
  circles: '<circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="12" cy="15.5" r="4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-4c0-1.7-2.7-3-6-3"/>',
  handshake: '<path d="M3 12l4-4 4 2 3-2 7 6"/><path d="M7 16l2 2M10 14l3 3M13 12l3 3"/><path d="M3 12l5 5 2-1"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8M9.5 17h5"/>',
  funnel: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  bars: '<path d="M4 20V11M10 20V5M16 20v-6M22 20H2"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  db: '<ellipse cx="12" cy="5.5" rx="8" ry="2.5"/><path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>',
  gauge: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.8-4.8"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  phone: '<path d="M5 3.5h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 5.8 5.8l1.4-2.2 4.5 1.5V18a2 2 0 0 1-2 2A16 16 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8.5 12h7M8.5 16h5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  snooze: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M5 3.5L2.5 6M19 3.5L21.5 6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 20h15"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="M15 6l-6 6 6 6"/>',
  chevronL: '<path d="M15 6l-6 6 6 6"/>',
  chevronR: '<path d="M9 6l6 6-6 6"/>',
  collapse: '<path d="M4 5h16M4 12h10M4 19h16M18 9l3 3-3 3"/>',
  alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  zap: '<path d="M13 2.5L4.5 13.5H12L11 21.5l8.5-11H12z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
};
const icon = (name, cls) => '<svg class="' + (cls || '') + '" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.info) + '</svg>';

/* ================================================================ badges */
const band = score => C.health.bands.find(b => score >= b.min);
const statusBadge = (key, label) => '<span class="badge st-' + key + '"><i class="dot"></i>' + esc(label) + '</span>';
const healthBadge = score => { const b = band(score); return statusBadge(b.key, b.label); };
function healthScore(score) {
  const b = band(score);
  const col = { good: 'var(--good)', warn: 'var(--warning)', ser: 'var(--serious)', crit: 'var(--critical)' }[b.key];
  return '<span class="score" title="' + esc(b.label) + '"><b>' + n(score) + '</b><span class="mini"><i style="width:' + score + '%;background:' + col + '"></i></span><span class="sr">' + esc(b.label) + '</span></span>';
}
const planBadge = key => '<span class="plan ' + key + '"><i></i>' + esc(C.plans[key].name) + '</span>';
function delta(cur, prev, o) {
  o = o || {};
  if (prev == null || cur == null) return '';
  let ch, txt;
  if (o.abs) { ch = cur - prev; txt = o.fmt ? o.fmt(Math.abs(ch)) : n(Math.abs(ch)); }
  else if (o.points) { ch = cur - prev; txt = nfx(1).format(Math.abs(ch * 100)) + ' واحد'; }
  else { if (!prev) return ''; ch = (cur - prev) / Math.abs(prev); txt = nfx(Math.abs(ch) < 0.1 ? 1 : 0).format(Math.abs(ch * 100)) + '٪'; }
  const flat = Math.abs(o.abs || o.points ? ch : ch) < (o.flat || 0.005) && !(o.abs && ch !== 0);
  if (flat && (o.abs || o.points)) return '<span class="delta flat">بدون تغییر</span>';
  const goodUp = o.goodUp !== false;
  const cls = flat ? 'flat' : ((ch > 0) === goodUp ? 'good' : 'bad');
  return '<span class="delta ' + cls + '"><span class="ar">' + (flat ? '•' : ch > 0 ? '▲' : '▼') + '</span>' + txt + '</span>';
}
function meter(label, used, limit, o) {
  o = o || {};
  const r = limit ? used / limit : 0;
  const cls = r >= 0.95 ? 'crit' : r >= 0.8 ? 'warn' : '';
  return '<div class="meter ' + cls + '"><div class="top"><span>' + esc(label) + '</span><span><b>' + (o.fmt || n)(used) + '</b> <span class="muted">از ' + (limit ? (o.fmt || n)(limit) : 'نامحدود') + '</span>' + (limit ? ' · <b>' + pct(Math.min(r, 9.99)) + '</b>' : '') + '</span></div><div class="bar"><i style="width:' + Math.min(100, r * 100) + '%"></i></div></div>';
}
function kpi(o) {
  const tag = o.href ? 'a href="' + esc(o.href) + '"' : 'div';
  return '<' + tag + ' class="kpi">' +
    '<div class="lab">' + esc(o.label) + (o.info ? '<span title="' + esc(o.info) + '">' + icon('info', 'i') + '</span>' : '') + '</div>' +
    '<div class="val">' + o.value + (o.unit ? '<small>' + esc(o.unit) + '</small>' : '') + '</div>' +
    '<div class="foot"><div class="cmp">' + (o.delta || '') + (o.cmp ? '<div>' + o.cmp + '</div>' : '') + '</div>' + (o.spark ? '<div class="spark">' + o.spark + '</div>' : '') + '</div>' +
    '</' + (o.href ? 'a' : 'div') + '>';
}
function card(o) {
  return '<section class="card ' + (o.cls || '') + '"' + (o.id ? ' id="' + o.id + '"' : '') + '>' +
    (o.title ? '<div class="card-h"><h2>' + o.title + '</h2>' + (o.hint ? '<span class="hint">' + o.hint + '</span>' : '') + (o.acts ? '<div class="acts">' + o.acts + '</div>' : '') + '</div>' : '') +
    '<div class="card-b ' + (o.flush ? 'flush' : '') + '"' + (o.bodyId ? ' id="' + o.bodyId + '"' : '') + '>' + (o.body || '') + '</div>' +
    (o.foot ? '<div class="card-f">' + o.foot + '</div>' : '') + '</section>';
}
const custLink = a => 'customer.html?id=' + a.id;
function acctCell(a, o) {
  o = o || {};
  return '<a class="nm" href="' + custLink(a) + '" data-acc="' + a.id + '">' + esc(a.name) + '</a><span class="s">' +
    (o.sub != null ? o.sub : esc(a.contact.first + ' ' + a.contact.last) + ' · ' + esc(a.city)) + '</span>';
}
function lastSeen(a) {
  return a.online ? '<span class="live"><i></i>آنلاین</span>' : '<span class="' + (a.lastSeenDays > 14 ? 'faint' : '') + '">' + esc(ago(a.lastSeenMin)) + '</span>';
}
function signals(a) {
  let s = '';
  if (a.pastDue) s += '<span class="sig due">پرداخت ناموفق</span> ';
  if (a.limitHits30) s += '<span class="sig limit" title="برخورد با سقف پلن در ۳۰ روز">' + fa(a.limitHits30) + '× سقف</span> ';
  if (a.pricingVisits30) s += '<span class="sig price" title="بازدید صفحهٔ قیمت در ۳۰ روز">' + fa(a.pricingVisits30) + '× قیمت</span>';
  return s || '<span class="faint">—</span>';
}
function repName(id, short) { const r = id && DB.rep(id); return r ? (short ? r.short : r.name) : '<span class="faint">بدون مسئول</span>'; }

/* ================================================================== toast */
function toast(msg, undo) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button>بازگردانی</button>' : '');
  if (undo) t.querySelector('button').onclick = () => { undo(); t.remove(); };
  box.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

/* ================================================================== modal */
let scrimEl;
function scrim(on, onClick) {
  if (!scrimEl) { scrimEl = document.createElement('div'); scrimEl.className = 'scrim'; document.body.appendChild(scrimEl); }
  scrimEl.onclick = onClick || null;
  if (on) { scrimEl.style.display = 'block'; requestAnimationFrame(() => scrimEl.classList.add('on')); }
  else { scrimEl.classList.remove('on'); setTimeout(() => { if (!scrimEl.classList.contains('on')) scrimEl.style.display = 'none'; }, 160); }
}
function modal(o) {
  const m = document.createElement('div'); m.className = 'modal ' + (o.cls || ''); m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = (o.title ? '<div class="mh"><span>' + esc(o.title) + '</span><button class="btn ghost sm icon" data-close aria-label="بستن">' + icon('x') + '</button></div>' : '') + '<div class="mb">' + (o.body || '') + '</div>' + (o.foot ? '<div class="mf">' + o.foot + '</div>' : '');
  document.body.appendChild(m);
  const close = () => { m.classList.remove('on'); scrim(false); document.removeEventListener('keydown', key, true); setTimeout(() => m.remove(), 150); if (o.onClose) o.onClose(); };
  const key = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); close(); } };
  document.addEventListener('keydown', key, true);
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = close);
  scrim(true, close);
  requestAnimationFrame(() => m.classList.add('on'));
  const f = m.querySelector('[autofocus], input, textarea, select'); if (f) setTimeout(() => f.focus(), 30);
  return { el: m, close };
}

/* --- quick forms shared by drawer, profile and the today page */
function logOutcome(acc, taskId, done) {
  const body = '<div class="field">نتیجه<select class="select" id="oc">' +
    '<option value="reached">صحبت شد</option><option value="noanswer">پاسخ نداد</option><option value="callback">بعداً تماس بگیرم</option>' +
    '<option value="won">موفق — ارتقا/تمدید قطعی شد</option><option value="lost">مشتری نمی‌خواهد ادامه دهد</option></select></div>' +
    '<div class="field">یادداشت<textarea class="input" id="nt" rows="3" placeholder="چه گفت؟ قدم بعدی چیست؟"></textarea></div>' +
    '<div class="field">پیگیری بعدی<div class="seg" id="nx"><button data-v="0" class="on">ندارد</button><button data-v="1">فردا</button><button data-v="3">۳ روز</button><button data-v="7">یک هفته</button></div></div>';
  const md = modal({ title: 'ثبت نتیجهٔ تماس — ' + acc.name, body, foot: '<button class="btn primary" id="sv">' + icon('check') + 'ثبت</button><button class="btn ghost" data-close>انصراف</button>' });
  let next = 0;
  md.el.querySelectorAll('#nx button').forEach(b => b.onclick = () => { md.el.querySelectorAll('#nx button').forEach(x => x.classList.remove('on')); b.classList.add('on'); next = +b.dataset.v; });
  md.el.querySelector('#sv').onclick = () => {
    const oc = md.el.querySelector('#oc').value, text = md.el.querySelector('#nt').value.trim();
    const label = { reached: 'صحبت شد', noanswer: 'پاسخ نداد', callback: 'بعداً تماس', won: 'موفق', lost: 'از دست رفت' }[oc];
    addNote(acc.id, { kind: 'call', outcome: oc, text: label + (text ? ' — ' + text : ''), next });
    if (taskId) setTask(taskId, next ? { status: 'snoozed', snoozeDays: next, outcome: oc } : { status: 'done', outcome: oc });
    md.close(); toast('نتیجه ثبت شد' + (next ? ' · پیگیری ' + inDays(next) : ''));
    if (done) done();
  };
}
function addNoteForm(acc, done) {
  const md = modal({ title: 'یادداشت — ' + acc.name, body: '<textarea class="input" id="nt" rows="4" placeholder="یادداشت برای همکاران…" autofocus></textarea>', foot: '<button class="btn primary" id="sv">ذخیره</button><button class="btn ghost" data-close>انصراف</button>' });
  md.el.querySelector('#sv').onclick = () => {
    const t = md.el.querySelector('#nt').value.trim(); if (!t) return;
    addNote(acc.id, { kind: 'note', text: t }); md.close(); toast('یادداشت ذخیره شد'); if (done) done();
  };
}
function revealContact(acc, field, el) {
  logAudit('نمایش ' + (field === 'mobile' ? 'شمارهٔ موبایل' : 'ایمیل') + ' — ' + acc.name);
  el.outerHTML = field === 'mobile' ? '<a class="ltr" href="tel:' + acc.contact.mobile + '" style="font-weight:700">' + fa(acc.contact.mobile) + '</a>' : '<a class="ltr" href="mailto:' + acc.contact.email + '">' + esc(acc.contact.email) + '</a>';
}

/* ================================================================= drawer */
let drawerEl = null, drawerId = null;
function openAccount(id) {
  const a = DB.byId.get(+id); if (!a) return;
  drawerId = a.id;
  if (!drawerEl) {
    drawerEl = document.createElement('aside'); drawerEl.className = 'drawer'; drawerEl.setAttribute('role', 'dialog'); drawerEl.setAttribute('aria-label', 'نمای سریع مشتری');
    document.body.appendChild(drawerEl);
  }
  renderDrawer(a);
  drawerEl.style.display = 'flex';
  scrim(true, closeAccount);
  requestAnimationFrame(() => drawerEl.classList.add('on'));
  setTimeout(() => { const b = drawerEl.querySelector('[data-close]'); if (b) b.focus(); }, 60);
}
function closeAccount() {
  if (!drawerEl || !drawerEl.classList.contains('on')) return;
  drawerEl.classList.remove('on'); scrim(false); drawerId = null; Charts.hideTip();
}
function renderDrawer(a) {
  const owner = ownerOf(a);
  const b = band(a.health);
  const comps = C.health.components.map(c => '<div class="comp" title="' + esc(c.desc) + '"><span>' + esc(c.label) + '</span><span class="tr"><i style="width:' + (a.components[c.key] / 20 * 100) + '%"></i></span><b>' + n(a.components[c.key]) + '</b></div>').join('');
  const last30 = []; for (let d = 29; d >= 0; d--) last30.push(a.ev[d]);
  const tasks = owner ? DB.tasksFor(owner).filter(t => t.accountId === a.id && !(taskState(t.id) || {}).status) : [];
  const ns = notes(a.id).slice(0, 3);
  const acts = DB.activities.filter(x => x.accountId === a.id).slice(0, 4);
  const repOpts = '<option value="">بدون مسئول</option>' + C.reps.map(r => '<option value="' + r.id + '"' + (r.id === owner ? ' selected' : '') + '>' + esc(r.name) + '</option>').join('');
  const hist = a.healthHistory.filter(x => x != null);
  drawerEl.innerHTML =
    '<div class="dh"><span class="avatar lg">' + esc(initials(a.name)) + '</span><div style="flex:1;min-width:0"><h3>' + esc(a.name) + '</h3>' +
    '<div class="row wrap" style="gap:8px;font-size:12px;color:var(--muted)">' + planBadge(a.plan) + (a.paying ? '<span>' + money(a.mrr) + ' در ماه</span>' : '') + '<span>' + esc(a.industryName) + ' · ' + esc(a.city) + '</span></div></div>' +
    '<button class="btn ghost icon" data-close aria-label="بستن (Esc)">' + icon('x') + '</button></div>' +
    '<div class="db">' +
      '<div class="row top" style="gap:16px">' +
        '<div><div class="muted" style="font-size:11.5px;font-weight:700">امتیاز سلامت</div><div class="row" style="gap:10px"><span class="hero" style="font-size:38px">' + n(a.health) + '</span>' + healthBadge(a.health) + '</div>' +
        '<div class="row" style="gap:6px;font-size:11.5px;color:var(--muted)">' + Charts.spark(hist, { w: 70, h: 18, color: 'var(--ink-2)' }) + ' ۸ هفتهٔ اخیر ' + (a.health2wAgo != null ? delta(a.health, a.health2wAgo, { abs: true }) : '') + '</div></div>' +
        '<div style="flex:1;min-width:0">' + comps + '</div>' +
      '</div>' +
      (a.pastDue || a.limitHits30 || a.pricingVisits30 || a.tickets ? '<div class="row wrap" style="gap:6px">' + signals(a) + (a.tickets ? ' <span class="sig due">' + fa(a.tickets) + ' تیکت باز</span>' : '') + '</div>' : '') +
      '<div class="sec"><h4>وضعیت</h4>' +
        '<div class="kv"><span class="k">آخرین فعالیت</span><span class="v">' + lastSeen(a) + '</span></div>' +
        '<div class="kv"><span class="k">اعضای فعال این هفته</span><span class="v">' + n(a.activeMembers7) + ' از ' + n(a.memberCount) + (a.paying && a.plan !== 'basic' ? ' <span class="muted">(' + n(a.seats) + ' صندلی)</span>' : '') + '</span></div>' +
        (a.paying ? '<div class="kv"><span class="k">تمدید بعدی</span><span class="v">' + date(-a.renewIn) + ' · ' + inDays(a.renewIn) + ' <span class="muted">(' + esc(C.cycles[a.cycle].name) + ')</span></span></div>' : '') +
        (a.churnedAt !== undefined ? '<div class="kv"><span class="k">لغو اشتراک</span><span class="v">' + date(a.churnedAt) + ' · ' + esc(a.churnReason) + '</span></div>' : '') +
        '<div class="kv"><span class="k">عضو از</span><span class="v">' + date(a.age) + ' · ' + esc(DB.source(a.source).name) + '</span></div>' +
        '<div class="kv"><span class="k">مسئول</span><span class="v"><select class="select" id="dr-owner" style="height:28px;font-size:12px">' + repOpts + '</select></span></div>' +
      '</div>' +
      '<div class="sec"><h4>فعالیت ۳۰ روز اخیر <span class="faint" style="font-weight:400">— ویرایش در روز</span></h4>' + Charts.spark(last30, { w: 460, h: 44, bars: true }) + '</div>' +
      '<div class="sec"><h4>مصرف پلن</h4><div class="stack" style="gap:9px">' + a.usage.filter(u => u.limit).sort((p, q) => q.ratio - p.ratio).slice(0, 3).map(u => meter(u.label, u.used, u.limit)).join('') + '</div></div>' +
      '<div class="sec"><h4>تماس</h4>' +
        '<div class="kv"><span class="k">' + esc(a.contact.first + ' ' + a.contact.last) + ' <span class="faint">(مالک)</span></span><span class="v"><button class="btn sm ghost" data-reveal="mobile">' + icon('eye') + '<span class="ltr">' + maskMobile(a.contact.mobile) + '</span></button></span></div>' +
        '<div class="kv"><span class="k">ایمیل</span><span class="v"><button class="btn sm ghost" data-reveal="email">' + icon('eye') + 'نمایش</button></span></div>' +
        '<div class="note">نمایش اطلاعات تماس در گزارش ممیزی ثبت می‌شود.</div>' +
      '</div>' +
      (tasks.length ? '<div class="sec"><h4>کارهای باز</h4>' + tasks.map(t => '<div class="li"><span class="main"><span class="t">' + esc(DB.TASK_TYPES[t.type].label) + '</span><span class="d">' + esc(t.why) + '</span></span><span class="end">' + (t.due <= 0 ? '<span class="sig due">امروز</span>' : inDays(t.due)) + '</span></div>').join('') + '</div>' : '') +
      '<div class="sec"><h4>آخرین تعامل‌ها</h4>' + (ns.length || acts.length ?
        ns.map(x => '<div class="li"><span class="main"><span class="t" style="font-weight:600">' + esc(x.text) + '</span><span class="d">' + esc(x.who) + ' · همین مرورگر</span></span></div>').join('') +
        acts.map(x => '<div class="li"><span class="main"><span class="t" style="font-weight:600">' + esc(DB.OUTCOME_LABEL[x.outcome] || x.outcome) + (x.mrr ? ' · ' + money(x.mrr) : '') + '</span><span class="d">' + esc(DB.rep(x.rep).short) + ' · ' + esc(agoDays(x.t)) + ' ' + clock(x.min) + '</span></span></div>').join('')
        : '<div class="note">هنوز تماسی ثبت نشده.</div>') + '</div>' +
    '</div>' +
    '<div class="df"><a class="btn primary" href="' + custLink(a) + '">' + icon('user') + 'پروفایل کامل</a>' +
      '<button class="btn" data-act="call">' + icon('phone') + 'ثبت تماس</button><button class="btn" data-act="note">' + icon('note') + 'یادداشت</button></div>';
  drawerEl.querySelector('[data-close]').onclick = closeAccount;
  drawerEl.querySelectorAll('[data-reveal]').forEach(bt => bt.onclick = () => revealContact(a, bt.dataset.reveal, bt));
  drawerEl.querySelector('#dr-owner').onchange = ev => { setOwner([a.id], ev.target.value || null); toast('مسئول «' + a.name + '» تغییر کرد'); };
  drawerEl.querySelector('[data-act=call]').onclick = () => logOutcome(a, null, () => renderDrawer(a));
  drawerEl.querySelector('[data-act=note]').onclick = () => addNoteForm(a, () => renderDrawer(a));
}
// any element with data-acc opens the drawer on plain click; modified clicks follow the link
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-acc]');
  if (!t || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) return;
  ev.preventDefault(); openAccount(t.dataset.acc);
});

/* ================================================================ palette */
let pal = null;
const PAGE_INDEX = [];
function openPalette(prefill) {
  if (pal) return;
  const md = modal({ cls: 'palette', body: '' });
  pal = md;
  md.el.innerHTML = '<div class="pi">' + icon('search') + '<input id="pq" placeholder="جستجوی مشتری، شماره، ایمیل، بیس یا صفحه…" autocomplete="off"><span class="kbd">Esc</span></div><div class="res" id="pr"></div>' +
    '<div class="hintbar"><span><span class="kbd">↑</span> <span class="kbd">↓</span> حرکت</span><span><span class="kbd">Enter</span> نمای سریع</span><span><span class="kbd">Ctrl</span>+<span class="kbd">Enter</span> صفحهٔ کامل</span></div>';
  const q = md.el.querySelector('#pq'), res = md.el.querySelector('#pr');
  let items = [], act = 0;
  const draw = () => {
    const s = norm(q.value);
    items = [];
    if (s) {
      const hits = [];
      for (const a of DB.accounts) {
        const hay = norm(a.name + ' ' + a.slug + ' ' + a.contact.first + ' ' + a.contact.last + ' ' + a.contact.mobile + ' ' + a.contact.email + ' ' + a.city);
        const i = hay.indexOf(s);
        if (i >= 0) hits.push([a, (i === 0 ? 0 : 1) - a.mrr / 1e8 - (a.lastSeenDays < 7 ? 0.5 : 0)]);
      }
      hits.sort((p, q2) => p[1] - q2[1]).slice(0, 7).forEach(([a]) => items.push({ grp: 'مشتریان', ic: 'user', t: a.name, d: C.plans[a.plan].name + ' · ' + a.contact.first + ' ' + a.contact.last + ' · سلامت ' + fa(a.health), end: a.paying ? money(a.mrr) : '', acc: a.id, href: custLink(a) }));
      let nb = 0;
      for (const a of DB.accounts) { for (const b of a.bases) { if (nb >= 4) break; if (norm(b.name + ' ' + b.slug + ' ' + a.name).includes(s)) { nb++; items.push({ grp: 'بیس‌ها', ic: 'db', t: b.name, d: a.name + ' · /' + b.slug, end: fa(b.records) + ' رکورد', href: 'base.html?id=' + b.id }); } } if (nb >= 4) break; }
    }
    PAGE_INDEX.filter(p => !s || norm(p.label).includes(s)).slice(0, s ? 5 : 8).forEach(p => items.push({ grp: 'صفحه‌ها', ic: p.icon, t: p.label, d: p.grp, href: p.href }));
    if (!s) items.unshift({ grp: 'کارها', ic: theme === 'dark' ? 'sun' : 'moon', t: 'تغییر تم روشن/تیره', run: toggleTheme });
    act = 0; render();
  };
  const render = () => {
    let g = '', h = '';
    items.forEach((it, i) => {
      if (it.grp !== g) { g = it.grp; h += '<div class="grp">' + esc(g) + '</div>'; }
      h += '<div class="r' + (i === act ? ' act' : '') + '" data-i="' + i + '"><span class="ic">' + icon(it.ic) + '</span><span style="min-width:0"><div style="font-weight:700">' + esc(it.t) + '</div>' + (it.d ? '<div class="d">' + esc(it.d) + '</div>' : '') + '</span>' + (it.end ? '<span class="end">' + esc(it.end) + '</span>' : '') + '</div>';
    });
    res.innerHTML = h || '<div class="empty"><b>چیزی پیدا نشد</b>نام شرکت، نام شخص، شمارهٔ موبایل یا نشانی بیس را امتحان کنید.</div>';
    res.querySelectorAll('.r').forEach(r => { r.onmousemove = () => { if (act !== +r.dataset.i) { act = +r.dataset.i; render(); } }; r.onclick = ev => go(items[+r.dataset.i], ev.ctrlKey || ev.metaKey); });
    const el = res.querySelector('.r.act'); if (el) el.scrollIntoView({ block: 'nearest' });
  };
  const go = (it, full) => {
    if (!it) return;
    md.close(); pal = null;
    if (it.run) return it.run();
    if (it.acc && !full) return openAccount(it.acc);
    location.href = it.href;
  };
  q.addEventListener('input', draw);
  q.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowDown') { act = Math.min(items.length - 1, act + 1); render(); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { act = Math.max(0, act - 1); render(); ev.preventDefault(); }
    else if (ev.key === 'Enter') { go(items[act], ev.ctrlKey || ev.metaKey); ev.preventDefault(); }
  });
  const origClose = md.close; md.close = () => { origClose(); pal = null; };
  scrimEl.onclick = md.close;
  if (prefill) q.value = prefill;
  draw(); setTimeout(() => q.focus(), 20);
}

/* ================================================================= alerts */
function alerts() {
  const out = [];
  DB.ops.crons.filter(c => c.status === 'fail').forEach(c => out.push({ lvl: 'crit', t: 'کران «' + c.name + '» اجرا نشد', d: agoDays(c.lastT) + ' ' + c.lastAt + ' · اشتراک‌های منقضی هنوز فعال‌اند', href: 'jobs.html' }));
  DB.ops.ingestion.filter(s => s.status === 'crit').forEach(s => out.push({ lvl: 'crit', t: 'تأخیر در ' + s.desc, d: s.name + ' · ' + fa(Math.round(s.lagMin / 60)) + ' ساعت عقب', href: 'data-health.html' }));
  const pd = DB.accounts.filter(a => a.pastDue);
  if (pd.length) out.push({ lvl: 'warn', t: fa(pd.length) + ' پرداخت تمدید ناموفق', d: money(pd.reduce((t, a) => t + a.mrr, 0)) + ' درآمد ماهانه در دورهٔ مهلت', href: 'sales.html#pastdue' });
  const crit = DB.accounts.filter(a => a.paying && a.health < 30 && (a.plan === 'pro' || a.plan === 'ent'));
  if (crit.length) out.push({ lvl: 'crit', t: fa(crit.length) + ' مشتری پرو/سازمانی بحرانی شده', d: 'مجموع ' + money(crit.reduce((t, a) => t + a.mrr, 0)) + ' در ماه', href: 'health.html' });
  DB.ops.queues.filter(q => q.waiting > 1000).forEach(q => out.push({ lvl: 'warn', t: 'صف ' + q.name + ' عقب افتاده', d: fa(q.waiting) + ' کار در انتظار · ' + fa(q.failed24) + ' ناموفق در ۲۴ ساعت', href: 'jobs.html' }));
  const un = DB.accounts.filter(a => a.segments.includes('upsell') && !ownerOf(a));
  if (un.length) out.push({ lvl: 'info', t: fa(un.length) + ' سرنخ ارتقا بدون مسئول', d: 'به یکی از اعضای تیم فروش بدهید', href: 'customers.html?view=unassigned' });
  return out;
}

/* ================================================================== shell */
const NAV = [
  { grp: 'کار روزانه', items: [
    { id: 'today', href: 'today.html', label: 'کارهای امروز', icon: 'inbox' },
    { id: 'overview', href: 'overview.html', label: 'نمای کلی', icon: 'grid' },
    { id: 'ai', href: 'ai.html', label: 'تحلیل هوشمند', icon: 'sparkle' },
  ] },
  { grp: 'مشتریان', items: [
    { id: 'customers', href: 'customers.html', label: 'همهٔ مشتریان', icon: 'users' },
    { id: 'health', href: 'health.html', label: 'سلامت و ریسک', icon: 'heart' },
    { id: 'segments', href: 'segments.html', label: 'دسته‌بندی‌ها', icon: 'circles' },
    { id: 'onboarding', href: 'onboarding.html', label: 'ثبت‌نام‌های تازه', icon: 'flag' },
  ] },
  { grp: 'فروش و درآمد', items: [
    { id: 'revenue', href: 'revenue.html', label: 'درآمد', icon: 'coins' },
    { id: 'sales', href: 'sales.html', label: 'میز فروش', icon: 'handshake' },
    { id: 'team', href: 'team.html', label: 'عملکرد تیم فروش', icon: 'trophy' },
  ] },
  { grp: 'رشد محصول', items: [
    { id: 'funnel', href: 'funnel.html', label: 'قیف تبدیل', icon: 'funnel' },
    { id: 'retention', href: 'retention.html', label: 'نگهداشت', icon: 'layers' },
    { id: 'acquisition', href: 'acquisition.html', label: 'منابع جذب', icon: 'share' },
    { id: 'features', href: 'features.html', label: 'استفاده از قابلیت‌ها', icon: 'bars' },
    { id: 'journey', href: 'journey.html', label: 'نقشهٔ مسیر مشتری', icon: 'map' },
  ] },
  { grp: 'زیرساخت', items: [
    { id: 'bases', href: 'bases.html', label: 'بیس‌ها', icon: 'db' },
    { id: 'quota', href: 'quota.html', label: 'مصرف و سهمیه', icon: 'gauge' },
    { id: 'jobs', href: 'jobs.html', label: 'صف‌ها و زمان‌بندی', icon: 'clock' },
    { id: 'data', href: 'data-health.html', label: 'سلامت داده', icon: 'pulse' },
  ] },
  { grp: 'تنظیمات', items: [
    { id: 'settings', href: 'settings.html', label: 'تعریف‌ها و دسترسی', icon: 'gear' },
  ] },
];
NAV.forEach(g => g.items.forEach(it => PAGE_INDEX.push(Object.assign({ grp: g.grp }, it))));

function navBadges() {
  const m = me();
  const rep = m.role === 'rep' ? m.rep : null;
  const todayN = rep ? DB.tasksFor(rep).filter(t => t.due <= 0 && !(taskState(t.id) || {}).status).length : 0;
  return {
    today: todayN ? { n: todayN } : null,
    health: { n: DB.accounts.filter(a => a.paying && a.health < 30).length, warn: true },
    jobs: { n: DB.ops.crons.filter(c => c.status === 'fail').length, warn: true },
    data: { n: DB.ops.ingestion.filter(s => s.status === 'crit').length, warn: true },
  };
}

function freshness(sources) {
  const list = DB.ops.ingestion.filter(s => (sources || ['main']).includes(s.key));
  const worst = list.sort((p, q) => q.lagMin - p.lagMin)[0] || DB.ops.ingestion[0];
  return worst;
}
const lagText = m => m < 60 ? fa(m) + ' دقیقه' : m < 1440 * 2 ? fa(Math.round(m / 60)) + ' ساعت' : fa(Math.round(m / 1440)) + ' روز';

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nx = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nx); store.set('theme', nx);
  if (current) current.rerender();
}

let current = null;
function range() {
  const p = new URLSearchParams(location.search).get('r');
  const v = +(p || store.get('range', 30));
  return [7, 30, 90].includes(v) ? v : 30;
}
function setParam(k, v) {
  const u = new URL(location.href);
  if (v == null || v === '') u.searchParams.delete(k); else u.searchParams.set(k, v);
  history.replaceState(null, '', u);
}
const param = k => new URLSearchParams(location.search).get(k);

function page(o) {
  const m = me();
  const nb = navBadges();
  const collapsed = store.get('collapsed', false);
  const app = document.createElement('div');
  app.className = 'app' + (collapsed ? ' collapsed' : '');
  const navHtml = NAV.map(g => '<div class="grp">' + esc(g.grp) + '</div>' + g.items.map(it => {
    const b = nb[it.id];
    return '<a href="' + it.href + '" class="' + (it.id === o.id || it.id === o.nav ? 'on' : '') + '" title="' + esc(it.label) + '"' + (it.id === o.id ? ' aria-current="page"' : '') + '>' + icon(it.icon) + '<span>' + esc(it.label) + '</span>' + (b && b.n ? '<span class="cnt' + (b.warn ? ' warn' : '') + '">' + fa(b.n) + '</span>' : '') + '</a>';
  }).join('')).join('');
  const fr = freshness(o.sources);
  const al = alerts();
  const rp = m.role === 'rep' ? DB.rep(m.rep) : null;
  app.innerHTML =
    '<aside class="side"><div class="brand"><span class="logo">A</span><div><b>Airsheet</b><span>پنل مدیریت مشتری</span></div><button class="collapse-btn" id="collapse" title="جمع کردن منو">' + icon('collapse') + '</button></div>' +
    '<nav aria-label="منوی اصلی">' + navHtml + '</nav>' +
    '<div class="foot">زمان ماکاپ: ' + WEEKDAYS[DB.dayDate(0).getUTCDay()] + ' ' + date(0, { year: true }) + '، ' + clock(C.nowMinutes) + '<br><a href="index.html">گالری صفحه‌ها</a> · <a href="_v1/index.html">نسخهٔ قبلی</a></div></aside>' +
    '<div class="main">' +
      '<header class="topbar">' +
        '<button class="iconbtn menu-btn" id="menu" aria-label="منو">' + icon('menu') + '</button>' +
        '<button class="search-trigger" id="srch">' + icon('search') + '<span>جستجوی مشتری، شماره یا بیس…</span><span class="kbd">Ctrl K</span></button>' +
        '<span class="spacer"></span>' +
        (o.sources ? '<a class="fresh' + (fr.status === 'crit' ? ' bad' : '') + '" href="data-health.html" title="تازگی داده‌های این صفحه">' + statusDot(fr.status) + (fr.status === 'crit' ? 'داده با ' + lagText(fr.lagMin) + ' تأخیر' : 'به‌روز · ' + lagText(fr.lagMin) + ' پیش') + '</a>' : '') +
        '<div class="rel"><button class="iconbtn" id="bell" aria-label="هشدارها">' + icon('bell') + (al.length ? '<span class="dotcount">' + fa(al.length) + '</span>' : '') + '</button></div>' +
        '<button class="iconbtn" id="theme" aria-label="تغییر تم">' + icon('moon') + '</button>' +
        '<div class="rel"><button class="who" id="who"><span class="avatar">' + esc(rp ? initials(rp.name) : 'م') + '</span><span class="nm">' + esc(rp ? rp.name : 'مدیر فروش') + '</span></button></div>' +
      '</header>' +
      '<main class="content" id="content"></main>' +
    '</div>';
  document.body.appendChild(app);
  document.title = o.title + ' — پنل Airsheet';

  // wiring
  app.querySelector('#collapse').onclick = () => { app.classList.toggle('collapsed'); store.set('collapsed', app.classList.contains('collapsed')); };
  app.querySelector('#menu').onclick = () => app.classList.toggle('menu-open');
  app.querySelector('#srch').onclick = () => openPalette();
  app.querySelector('#theme').onclick = toggleTheme;
  app.querySelector('#bell').onclick = ev => popover(ev.currentTarget, '<div class="lbl">هشدارها</div>' + (al.length ? al.map(x => '<a class="it" href="' + x.href + '" style="align-items:flex-start">' + statusDot(x.lvl === 'info' ? 'info' : x.lvl) + '<span><b style="display:block;font-size:12.5px">' + esc(x.t) + '</b><span class="muted" style="font-size:11.5px">' + esc(x.d) + '</span></span></a>').join('') : '<div class="it">هشداری نیست</div>'), 320);
  app.querySelector('#who').onclick = ev => popover(ev.currentTarget, '<div class="lbl">نمایش پنل به‌عنوان</div>' +
    '<button class="it' + (m.role === 'manager' ? ' act' : '') + '" data-role="manager"><span class="avatar">م</span>مدیر فروش<span class="chk">' + (m.role === 'manager' ? '✓' : '') + '</span></button>' +
    C.reps.map(r => '<button class="it' + (m.role === 'rep' && m.rep === r.id ? ' act' : '') + '" data-rep="' + r.id + '"><span class="avatar">' + esc(initials(r.name)) + '</span>' + esc(r.name) + '<span class="chk">' + (m.role === 'rep' && m.rep === r.id ? '✓' : '') + '</span></button>').join('') +
    '<div class="sep"></div><div class="note" style="padding:4px 9px">نقش، پیش‌فرض صفحه‌ها را عوض می‌کند: «کارهای امروز» و «مشتریان من».</div>', 250, pop => {
    pop.querySelectorAll('[data-role],[data-rep]').forEach(b => b.onclick = () => { store.set('me', b.dataset.rep ? { role: 'rep', rep: b.dataset.rep } : { role: 'manager', rep: m.rep }); location.reload(); });
  });

  const content = app.querySelector('#content');
  const ctx = { el: content, range: range(), me: m, rerender };
  function rerender() {
    tables.length = 0;             // j/k must drive the tables of this render, not an old one
    ctx.range = range();
    const head = '<div class="page-head"><div>' + (o.crumbs ? '<div class="crumbs">' + o.crumbs + '</div>' : '') + '<h1>' + esc(typeof o.title === 'function' ? o.title() : o.title) + '</h1>' + (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') + '</div>' +
      '<div class="page-actions" id="pa">' + (o.range ? '<div class="seg" id="rng" role="group" aria-label="بازهٔ زمانی">' + [7, 30, 90].map(r => '<button data-r="' + r + '" class="' + (r === ctx.range ? 'on' : '') + '">' + fa(r) + ' روز</button>').join('') + '</div>' : '') + (o.actions ? o.actions(ctx) : '') + '</div></div>';
    const lag = o.sources ? freshness(o.sources) : null;
    const banner = lag && lag.status === 'crit' && !o.noBanner ? '<div class="banner crit">' + icon('alert') + '<div><b>بخشی از عددهای این صفحه ' + lagText(lag.lagMin) + ' عقب است.</b> ' + esc(lag.desc) + ' (' + esc(lag.name) + ') به‌خاطر باگ‌های شناخته‌شدهٔ لایهٔ لاگ کامل نمی‌رسد. <a href="data-health.html">جزئیات در «سلامت داده»</a></div></div>' : '';
    content.innerHTML = head + banner + '<div id="pg" class="stack" style="gap:16px"></div>';
    const rng = content.querySelector('#rng');
    if (rng) rng.querySelectorAll('button').forEach(b => b.onclick = () => { store.set('range', +b.dataset.r); setParam('r', b.dataset.r); rerender(); });
    ctx.body = content.querySelector('#pg');
    o.render(ctx);
    if (o.wire) o.wire(ctx);
  }
  current = { rerender };
  rerender();
  const op = param('open'); if (op) setTimeout(() => openAccount(op), 0);   // shareable quick-view link
  return ctx;
}
function statusDot(k) {
  const c = { good: 'var(--good)', warn: 'var(--warning)', ser: 'var(--serious)', crit: 'var(--critical)', info: 'var(--accent)' }[k] || 'var(--faint)';
  return '<i class="dot" style="background:' + c + ';margin-top:' + (k ? '0' : '0') + '"></i>';
}
function popover(anchor, html, width, wire) {
  document.querySelectorAll('.pop').forEach(p => p.remove());
  const p = document.createElement('div'); p.className = 'pop'; p.style.minWidth = (width || 220) + 'px'; p.innerHTML = html;
  anchor.parentElement.appendChild(p);
  if (wire) wire(p);
  setTimeout(() => {
    const off = ev => { if (!p.contains(ev.target)) { p.remove(); document.removeEventListener('pointerdown', off); } };
    document.addEventListener('pointerdown', off);
  });
  return p;
}

/* ================================================================== table */
/**
 * table(el, {
 *   columns:[{key, label, num, sort:(r)=>v, render:(r)=>html, csv:(r)=>text, cls, title}],
 *   rows, pageSize, search:{placeholder, text:(r)=>string}, filters:[{key,label,options:[{v,l}],test:(r,v)=>bool}],
 *   views:[{key,label,test:(r)=>bool}], sort:{key,dir}, onRow:(r)=>void, select, bulk:[{label,icon,run(rows)}],
 *   exportName, url:true, empty, compact, rowClass:(r)=>cls, id
 * })
 */
function table(el, o) {
  const P = o.url ? new URLSearchParams(location.search) : new URLSearchParams();
  const st = {
    q: P.get('q') || '',
    view: P.get('view') || (o.views ? (o.defaultView || o.views[0].key) : null),
    sort: P.get('sort') || (o.sort ? o.sort.key : null),
    dir: P.get('dir') || (o.sort ? o.sort.dir || 'desc' : 'desc'),
    page: 0,
    size: o.pageSize || 25,
    f: {},
    sel: new Set(),
    focus: -1,
  };
  (o.filters || []).forEach(f => { st.f[f.key] = P.get(f.key) || ''; });
  const colByKey = k => o.columns.find(c => c.key === k);
  const sync = () => {
    if (!o.url) return;
    setParam('q', st.q || null); if (o.views) setParam('view', st.view === (o.defaultView || o.views[0].key) ? null : st.view);
    setParam('sort', st.sort === (o.sort && o.sort.key) ? null : st.sort); setParam('dir', st.dir === ((o.sort && o.sort.dir) || 'desc') ? null : st.dir);
    (o.filters || []).forEach(f => setParam(f.key, st.f[f.key] || null));
  };
  let viewRows = [];
  const compute = () => {
    let rows = o.rows;
    if (o.views && st.view) { const v = o.views.find(x => x.key === st.view); if (v && v.test) rows = rows.filter(v.test); }
    (o.filters || []).forEach(f => { const v = st.f[f.key]; if (v) rows = rows.filter(r => f.test(r, v)); });
    if (st.q && o.search) { const s = norm(st.q); rows = rows.filter(r => norm(o.search.text(r)).includes(s)); }
    if (st.sort) {
      const c = colByKey(st.sort);
      if (c) {
        const get = typeof c.sort === 'function' ? c.sort : r => r[c.key];
        const dir = st.dir === 'asc' ? 1 : -1;
        rows = rows.slice().sort((a, b) => { const x = get(a), y = get(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
      }
    }
    viewRows = rows;
  };
  const viewCounts = () => o.views.map(v => v.test ? o.rows.filter(v.test).length : o.rows.length);
  function draw() {
    compute();
    const pages = Math.max(1, Math.ceil(viewRows.length / st.size));
    st.page = Math.min(st.page, pages - 1);
    const slice = viewRows.slice(st.page * st.size, st.page * st.size + st.size);
    const vc = o.views ? viewCounts() : [];
    let h = '';
    if (o.views) h += '<div class="chipbar" style="padding:12px 16px 0">' + o.views.map((v, i) => '<button class="chip' + (v.key === st.view ? ' on' : '') + '" data-view="' + v.key + '">' + esc(v.label) + ' <span class="n">' + fa(vc[i]) + '</span></button>').join('') + '</div>';
    h += '<div class="toolbar" style="padding:12px 16px">' +
      (o.search ? '<label class="searchbox">' + icon('search') + '<input class="input" data-q placeholder="' + esc(o.search.placeholder || 'جستجو…') + '" value="' + esc(st.q) + '"></label>' : '') +
      (o.filters || []).map(f => '<select class="select" data-f="' + f.key + '" aria-label="' + esc(f.label) + '"><option value="">' + esc(f.label) + ': همه</option>' + f.options.map(op => '<option value="' + esc(op.v) + '"' + (st.f[f.key] === String(op.v) ? ' selected' : '') + '>' + esc(op.l) + '</option>').join('') + '</select>').join('') +
      ((st.q || Object.values(st.f).some(Boolean)) ? '<button class="btn ghost sm" data-clear>پاک کردن فیلترها</button>' : '') +
      '<span class="count"><b>' + fa(viewRows.length) + '</b> ' + esc(o.unit || 'ردیف') + '</span>' +
      (o.toolbarExtra || '') +
      (o.exportName ? '<button class="btn sm" data-export title="خروجی CSV از همین ردیف‌های فیلترشده">' + icon('download') + 'خروجی CSV</button>' : '') +
      '</div>';
    if (o.select && st.sel.size) {
      h += '<div style="padding:0 16px 10px"><div class="bulkbar"><b>' + fa(st.sel.size) + ' انتخاب شده</b>' + (o.bulk || []).map((b, i) => b.html ? b.html : '<button class="btn sm" data-bulk="' + i + '">' + (b.icon ? icon(b.icon) : '') + esc(b.label) + '</button>').join('') + '<button class="btn ghost sm" data-unsel>لغو انتخاب</button></div></div>';
    }
    h += '<div class="tbl-wrap"><table class="tbl' + (o.compact ? ' compact' : '') + '"><thead><tr>' +
      (o.select ? '<th class="chkcol"><input type="checkbox" data-all aria-label="انتخاب همه در این صفحه"' + (slice.length && slice.every(r => st.sel.has(r.id)) ? ' checked' : '') + '></th>' : '') +
      o.columns.map(c => {
        const s = c.sort !== false && (c.sort || c.key) && !c.nosort;
        const on = st.sort === c.key;
        return '<th class="' + (c.num ? 'num ' : '') + (c.cls || '') + (s ? ' sortable' : '') + (on ? ' ' + st.dir : '') + '"' + (s ? ' data-sort="' + c.key + '" tabindex="0"' : '') + (c.title ? ' title="' + esc(c.title) + '"' : '') + (on ? ' aria-sort="' + (st.dir === 'asc' ? 'ascending' : 'descending') + '"' : '') + '>' + esc(c.label) + (s ? '<span class="ar">' + (on ? (st.dir === 'asc' ? '▲' : '▼') : '▼') + '</span>' : '') + '</th>';
      }).join('') + '</tr></thead><tbody>' +
      (slice.length ? slice.map((r, i) => '<tr data-i="' + i + '" class="' + (o.onRow ? 'click ' : '') + (st.sel.has(r.id) ? 'sel ' : '') + (i === st.focus ? 'kfocus ' : '') + (o.rowClass ? o.rowClass(r) : '') + '">' +
        (o.select ? '<td class="chkcol"><input type="checkbox" data-sel="' + r.id + '"' + (st.sel.has(r.id) ? ' checked' : '') + ' aria-label="انتخاب"></td>' : '') +
        o.columns.map(c => '<td class="' + (c.num ? 'num ' : '') + (c.cls || '') + '">' + (c.render ? c.render(r) : esc(r[c.key])) + '</td>').join('') + '</tr>').join('')
        : '<tr><td colspan="' + (o.columns.length + (o.select ? 1 : 0)) + '"><div class="empty"><b>' + esc(o.emptyTitle || 'ردیفی با این فیلترها نیست') + '</b>' + esc(o.empty || 'فیلترها را کم کنید یا عبارت جستجو را تغییر دهید.') + '</div></td></tr>') +
      '</tbody></table></div>';
    if (viewRows.length > st.size || o.pageSizes !== false) {
      const pg = [];
      const cur = st.page;
      const add = i => pg.push('<button data-page="' + i + '" class="' + (i === cur ? 'on' : '') + '">' + fa(i + 1) + '</button>');
      if (pages <= 7) for (let i = 0; i < pages; i++) add(i);
      else { add(0); if (cur > 2) pg.push('<span class="faint">…</span>'); for (let i = Math.max(1, cur - 1); i <= Math.min(pages - 2, cur + 1); i++) add(i); if (cur < pages - 3) pg.push('<span class="faint">…</span>'); add(pages - 1); }
      h += '<div class="tbl-foot"><span>نمایش ' + fa(viewRows.length ? st.page * st.size + 1 : 0) + ' تا ' + fa(Math.min(viewRows.length, (st.page + 1) * st.size)) + ' از ' + fa(viewRows.length) + '</span>' +
        '<span class="row" style="gap:10px"><select class="select" data-size style="height:28px" aria-label="ردیف در صفحه">' + [...new Set([st.size, 25, 50, 100])].sort((x, y) => x - y).map(s => '<option value="' + s + '"' + (s === st.size ? ' selected' : '') + '>' + fa(s) + ' ردیف</option>').join('') + '</select>' +
        '<span class="pager"><button data-page="' + (cur - 1) + '"' + (cur === 0 ? ' disabled' : '') + ' aria-label="قبلی">' + icon('chevronR') + '</button>' + pg.join('') + '<button data-page="' + (cur + 1) + '"' + (cur >= pages - 1 ? ' disabled' : '') + ' aria-label="بعدی">' + icon('chevronL') + '</button></span></span></div>';
    }
    el.innerHTML = h;
    wire(slice);
  }
  function wire(slice) {
    const q = el.querySelector('[data-q]');
    if (q) q.addEventListener('input', () => { st.q = q.value; st.page = 0; sync(); const pos = q.selectionStart; draw(); const nq = el.querySelector('[data-q]'); nq.focus(); nq.setSelectionRange(pos, pos); });
    el.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { st.view = b.dataset.view; st.page = 0; st.focus = -1; sync(); draw(); });
    el.querySelectorAll('[data-f]').forEach(s => s.onchange = () => { st.f[s.dataset.f] = s.value; st.page = 0; sync(); draw(); });
    const cl = el.querySelector('[data-clear]'); if (cl) cl.onclick = () => { st.q = ''; Object.keys(st.f).forEach(k => st.f[k] = ''); sync(); draw(); };
    el.querySelectorAll('[data-sort]').forEach(th => {
      const f = () => { const k = th.dataset.sort; if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = colByKey(k).num || colByKey(k).desc ? 'desc' : 'asc'; } sync(); draw(); };
      th.onclick = f; th.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); f(); } };
    });
    el.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { st.page = +b.dataset.page; st.focus = -1; draw(); el.scrollIntoView({ block: 'nearest' }); });
    const sz = el.querySelector('[data-size]'); if (sz) sz.onchange = () => { st.size = +sz.value; st.page = 0; draw(); };
    const ex = el.querySelector('[data-export]'); if (ex) ex.onclick = () => exportCsv();
    const all = el.querySelector('[data-all]'); if (all) all.onchange = () => { slice.forEach(r => all.checked ? st.sel.add(r.id) : st.sel.delete(r.id)); draw(); };
    el.querySelectorAll('[data-sel]').forEach(c => { c.onclick = ev => ev.stopPropagation(); c.onchange = () => { c.checked ? st.sel.add(+c.dataset.sel) : st.sel.delete(+c.dataset.sel); draw(); }; });
    el.querySelectorAll('[data-bulk]').forEach(b => b.onclick = () => { const rows = o.rows.filter(r => st.sel.has(r.id)); o.bulk[+b.dataset.bulk].run(rows, () => { st.sel.clear(); draw(); }); });
    if (o.bulkWire) o.bulkWire(el, () => o.rows.filter(r => st.sel.has(r.id)), () => { st.sel.clear(); draw(); });
    const un = el.querySelector('[data-unsel]'); if (un) un.onclick = () => { st.sel.clear(); draw(); };
    if (o.onRow) el.querySelectorAll('tbody tr[data-i]').forEach(tr => tr.addEventListener('click', ev => {
      if (ev.target.closest('a,button,input,select')) return;
      st.focus = +tr.dataset.i; o.onRow(slice[+tr.dataset.i]);
    }));
    api.slice = slice;
  }
  function exportCsv() {
    const cols = o.columns.filter(c => c.csv !== false);
    const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [cols.map(c => cell(c.label)).join(',')].concat(viewRows.map(r => cols.map(c => cell(c.csv ? c.csv(r) : r[c.key])).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (o.exportName || 'export') + '-' + DB.jalali(0).y + '-' + DB.jalali(0).m + '-' + DB.jalali(0).d + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    logAudit('خروجی CSV «' + (o.exportName || 'جدول') + '» (' + fa(viewRows.length) + ' ردیف)');
    toast('فایل CSV با ' + fa(viewRows.length) + ' ردیف ساخته شد');
  }
  const api = {
    redraw: draw, state: st, get rows() { return viewRows; }, slice: [],
    setRows(rows) { o.rows = rows; draw(); },
    moveFocus(d) { const len = api.slice.length; if (!len) return; st.focus = Math.max(0, Math.min(len - 1, st.focus + d)); el.querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('kfocus', i === st.focus)); const tr = el.querySelectorAll('tbody tr')[st.focus]; if (tr) tr.scrollIntoView({ block: 'nearest' }); },
    openFocus() { if (st.focus >= 0 && o.onRow) o.onRow(api.slice[st.focus]); },
  };
  draw();
  tables.push(api);
  return api;
}
const tables = [];

/* ======================================================== keyboard layer */
let listNav = null;           // pages can register {move(d), open(), act(key)}
document.addEventListener('keydown', ev => {
  const typing = ev.target && ev.target.closest ? ev.target.closest('input, textarea, select, [contenteditable]') : null;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); openPalette(); return; }
  if (ev.key === 'Escape') { if (drawerEl && drawerEl.classList.contains('on')) { closeAccount(); ev.preventDefault(); } document.querySelectorAll('.pop').forEach(p => p.remove()); return; }
  if (typing || ev.ctrlKey || ev.metaKey || ev.altKey || document.querySelector('.modal')) return;
  if (ev.key === '/') { ev.preventDefault(); openPalette(); return; }
  if (ev.key === '?') { shortcuts(); return; }
  const nav = listNav || (tables[0] ? { move: d => tables[0].moveFocus(d), open: () => tables[0].openFocus() } : null);
  if (!nav) return;
  if (ev.key === 'j' || ev.key === 'ArrowDown' && ev.shiftKey) { nav.move(1); ev.preventDefault(); }
  else if (ev.key === 'k' || ev.key === 'ArrowUp' && ev.shiftKey) { nav.move(-1); ev.preventDefault(); }
  else if (ev.key === 'Enter' && nav.open) { nav.open(); }
  else if (nav.act) nav.act(ev.key, ev);
});
function shortcuts() {
  modal({ title: 'میان‌برهای صفحه‌کلید', body: [
    ['Ctrl K یا /', 'جستجوی سراسری'], ['j / k', 'ردیف بعدی / قبلی'], ['Enter', 'نمای سریع ردیف انتخاب‌شده'], ['Esc', 'بستن نمای سریع یا پنجره'],
    ['d', 'در «کارهای امروز»: انجام شد'], ['s', 'در «کارهای امروز»: تعویق تا فردا'], ['c', 'در «کارهای امروز»: ثبت نتیجهٔ تماس'], ['?', 'همین راهنما'],
  ].map(([k, d]) => '<div class="kv"><span class="k">' + esc(d) + '</span><span class="v"><span class="kbd">' + esc(k) + '</span></span></div>').join('') });
}

global.UI = {
  fa, n, compact, compactParts, money, pct, signedPct, date, monthLabel, ago, agoDays, inDays, clock, esc, norm, initials, maskMobile, MONTHS, WEEKDAYS,
  store, me, ownerOf, setOwner, taskState, setTask, notes, addNote, logAudit, whoName,
  icon, statusBadge, healthBadge, healthScore, planBadge, delta, meter, kpi, card, custLink, acctCell, lastSeen, signals, repName, band, statusDot,
  toast, modal, logOutcome, addNoteForm, revealContact, openAccount, closeAccount, openPalette, alerts, page, table, popover, setParam, param, range,
  setListNav: nav => { listNav = nav; }, NAV, lagText, freshness,
};
})(window);
