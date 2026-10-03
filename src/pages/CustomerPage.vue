<template>
  <PageShell :title="d ? a.name : 'پروفایل مشتری'" :sources="['main', 'behavior', 'wallet']" :banner="false" :loading="loading" :error="error">
    <template #crumbs><router-link to="/customers">مشتریان</router-link> › <span v-if="d && d.fallback" class="faint">نمونه: بیشترین درآمد در خطر</span></template>
    <template v-if="d" #sub><PlanBadge :plan="a.plan" /><template v-if="a.industryName"> · {{ a.industryName }}</template><template v-if="a.city"> · {{ a.city }}</template> · عضو از {{ date(signupDaysAgo(a), { year: true }) }} ({{ sourceName(a.source) }})</template>
    <template v-if="d" #actions>
      <button class="btn" @click="dialogs.addNote(a)"><AppIcon name="note" />یادداشت</button>
      <button class="btn primary" @click="dialogs.logCall(a)"><AppIcon name="phone" />ثبت تماس</button>
    </template>

    <template v-if="d">
      <div v-if="a.pastDue" class="banner crit"><AppIcon name="card" /><div><b>پرداخت تمدید ناموفق.</b> آخرین فاکتور<template v-if="d.lastInvoiceRetries"> {{ fa(d.lastInvoiceRetries) }} بار تلاش شده و</template> پرداخت نشده و اشتراک در دورهٔ مهلت است — پیش از هر کار دیگر پیگیری کنید.</div></div>
      <div v-if="a.churnedAt != null" class="banner"><AppIcon name="alert" /><div><b>این مشتری {{ agoDays(a.churnedAt) }} اشتراکش را لغو کرد</b> ({{ a.churnReason }}). اگر کمتر از ۱۲۰ روز گذشته، در فهرست «بازگرداندنی» میز فروش است.</div></div>

      <div class="kpis">
        <KpiTile label="درآمد ماهانه" :value="a.mrr ? cp(a.mrr).num : '—'" :unit="a.mrr ? cp(a.mrr).unit + ' ' + CURRENCY : ''" :cmp="a.paying ? 'پلن ' + PLAN_NAME[a.plan] + (a.cycle ? ' · ' + CYCLE_NAME[a.cycle] : '') + (a.seats ? ' · ' + fa(a.seats) + ' همکار خریداری‌شده' : '') : 'پلن رایگان'" />
        <KpiTile label="امتیاز سلامت" :value="n(a.health)" :unit="bandLabel" :delta="a.health2wAgo != null ? { cur: a.health, prev: a.health2wAgo, abs: true } : null" cmp="نسبت به دو هفته پیش" :spark="{ values: a.healthHistory.filter((x) => x != null), color: 'var(--ink-2)' }" />
        <KpiTile label="آخرین فعالیت" :cmp="fa(a.activeDays28) + ' روز فعال از ۲۸ روز'">
          <template #value><span v-if="a.online" class="live" style="font-size: 20px"><i />آنلاین</span><template v-else>{{ ago(a.lastSeenMin) }}</template></template>
        </KpiTile>
        <KpiTile label="اعضای فعال این هفته" :value="n(a.activeMembers7)" :unit="'از ' + n(a.memberCount)">
          <template #cmp>
            <template v-if="a.collaboratorLimit == null">{{ fa(a.collaborators) }} همکار · بدون سقف</template>
            <template v-else>{{ fa(a.collaborators) }} همکار · <b v-if="a.seatsUsed >= a.collaboratorLimit" style="color: var(--warn-ink)">ظرفیت پلن ({{ fa(a.collaboratorLimit) }} نفر با مالک) پر است</b><template v-else>ظرفیت پلن: {{ fa(a.seatsUsed) }} از {{ fa(a.collaboratorLimit) }} نفر با مالک</template></template>
          </template>
        </KpiTile>
        <KpiTile v-if="a.paying" label="تمدید بعدی" :value="inDays(a.renewIn)">
          <template #cmp>{{ date(-a.renewIn, { year: true }) }}<template v-if="a.renewIn <= 14 && a.health < 60"> · <b style="color: var(--crit-ink)">در خطر</b></template></template>
        </KpiTile>
        <KpiTile v-else label="ارزش ارتقا" :value="'+' + compact(a.upgradeValue)" unit="در ماه">
          <template #cmp><b v-if="a.segments.includes('upsell')" style="color: var(--accent-ink)">آمادهٔ ارتقا</b><template v-else>بدون سیگنال خرید</template></template>
        </KpiTile>
        <KpiTile label="جمع پرداخت‌ها" :value="d.paidTotal ? cp(d.paidTotal).num : '—'" :unit="d.paidTotal ? cp(d.paidTotal).unit + ' ' + CURRENCY : ''" :cmp="fa(d.paidCount) + ' فاکتور · مشتری ' + (a.tenureDays ? fa(Math.round(a.tenureDays / 30)) + ' ماه' : '—')" />
      </div>

      <div class="card"><div class="tabs" style="padding: 0 12px" role="tablist">
        <button v-for="t in tabs" :key="t.key" role="tab" :class="{ on: t.key === tab }" @click="tab = t.key">{{ t.label }} <span v-if="t.n != null" class="n">{{ fa(t.n) }}</span></button>
      </div></div>

      <!-- summary -->
      <div v-if="tab === 'summary'" class="grid g-main">
        <div class="stack">
          <PanelCard :title="'فعالیت ' + fa(act90.series[0].values.length) + ' روز'" hint="ویرایش در روز">
            <ColumnChart v-if="act90.series[0].values.length" :options="act90" /><div v-else class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div>
            <div class="row wrap" style="gap: 18px; margin-top: 10px; font-size: 12px">
              <span><span class="muted">رکورد ساخته‌شده در ۳۰ روز:</span> <b>{{ n(a.records30) }}</b></span>
              <span><span class="muted">روند ۱۴ روزه:</span> <DeltaChip v-if="a.trendPct" :cur="100 + a.trendPct" :prev="100" /><b v-else>بدون تغییر</b></span>
              <span><span class="muted">اعضای فعال امروز:</span> <b>{{ n(d.activeMembersToday) }}</b></span>
            </div>
          </PanelCard>
          <PanelCard title="مسیر این مشتری" hint="از ثبت‌نام تا آخرین فعالیت">
            <div class="tl"><div v-for="(e, i) in journey" :key="i" class="ev" :class="e.cls"><div class="t">{{ e.title }} <span class="w">{{ e.when || date(e.t, { year: true }) }}</span><span v-if="e.earliestSeen" class="w"> · زودترین مورد ثبت‌شده</span></div><div v-if="e.desc" class="d">{{ e.desc }}</div></div></div>
            <div v-if="jLoading" class="note" style="margin-top: 12px">در حال خواندن قدم‌ها…</div>
            <div v-else-if="jError" class="note" style="margin-top: 12px">قدم‌های مسیر خوانده نشد: {{ jError.message }}</div>
            <template v-else-if="jr">
              <div v-if="jr.notYet.length" class="note" style="margin-top: 12px">هنوز انجام نداده: {{ jr.notYet.join('، ') }}</div>
              <div v-if="!jr.behaviorAvailable" class="note" style="margin-top: 8px">گزارش رفتار در دسترس نبود؛ قدم‌هایی مثل اولین رکورد و تنظیم نما نمایش داده نشده‌اند.</div>
              <div v-else-if="!jr.fullyObserved && jr.observedSince" class="note" style="margin-top: 8px">رفتار کاربران از {{ date(daysAgo(jr.observedSince), { year: true }) }} ثبت می‌شود و این مشتری قبل از آن ثبت‌نام کرده؛ قدم‌های «زودترین مورد ثبت‌شده» ممکن است زودتر هم انجام شده باشند، و فعال‌سازی و عادت که به هفته‌های اول ثبت‌نام بسته‌اند قابل محاسبه نیستند.</div>
            </template>
          </PanelCard>
        </div>
        <div class="stack">
          <PanelCard v-if="p" title="اطلاعات تماس و حساب">
            <div class="kv"><span class="k">نام</span><span class="v"><b>{{ p.name || '—' }}</b></span></div>
            <div class="kv"><span class="k">موبایل</span><span class="v"><template v-if="p.mobile"><a class="ltr" :href="'tel:' + p.mobile" style="font-weight: 700">{{ fa(p.mobile) }}</a><button class="btn sm ghost icon" title="کپی شماره" aria-label="کپی شماره" @click="copy(p.mobile)"><AppIcon name="copy" /></button></template><span v-else class="faint">—</span></span></div>
            <div class="kv"><span class="k">ایمیل</span><span class="v"><template v-if="p.email"><a class="ltr" :href="'mailto:' + p.email">{{ p.email }}</a><button class="btn sm ghost icon" title="کپی ایمیل" aria-label="کپی ایمیل" @click="copy(p.email)"><AppIcon name="copy" /></button></template><span v-else class="faint">ثبت نشده</span></span></div>
            <div v-if="p.username" class="kv"><span class="k">نام کاربری</span><span class="v ltr">{{ p.username }}</span></div>

            <template v-if="p.company">
              <div class="sub-h">شرکت (قرارداد سازمانی)</div>
              <div class="kv"><span class="k">نام شرکت</span><span class="v">{{ p.company.name || '—' }}</span></div>
              <div v-if="p.company.phone" class="kv"><span class="k">تلفن شرکت</span><span class="v"><a class="ltr" :href="'tel:' + p.company.phone">{{ fa(p.company.phone) }}</a></span></div>
              <div v-if="p.company.nationalId" class="kv"><span class="k">شناسهٔ ملی</span><span class="v ltr">{{ fa(p.company.nationalId) }}</span></div>
              <div v-if="p.company.registrationNumber" class="kv"><span class="k">شمارهٔ ثبت</span><span class="v ltr">{{ fa(p.company.registrationNumber) }}</span></div>
              <div v-if="p.company.address" class="kv"><span class="k">نشانی</span><span class="v" style="white-space: normal; text-align: start">{{ p.company.address }}</span></div>
            </template>

            <div class="sub-h">حساب</div>
            <div class="kv"><span class="k">وضعیت</span><span class="v"><StatusBadge v-if="p.blocked" status="crit" label="مسدود" /><StatusBadge v-else status="good" label="فعال" /></span></div>
            <div class="kv"><span class="k">عضو از</span><span class="v">{{ dateTime(p.signedUpAt) }}</span></div>
            <div v-if="p.planUntil" class="kv"><span class="k">اعتبار پلن</span><span class="v">{{ p.planFrom ? dateTime(p.planFrom) + ' تا ' : 'تا ' }}{{ dateTime(p.planUntil) }}</span></div>
            <div class="kv"><span class="k">معرف</span><span class="v"><router-link v-if="p.referredBy" :to="'/customers/' + p.referredBy.id">{{ p.referredBy.name || fa(p.referredBy.mobile || '') }}</router-link><span v-else class="faint">مستقیم</span></span></div>
            <div class="kv"><span class="k">معرفی کرده</span><span class="v">{{ p.referrals ? fa(p.referrals) + ' نفر' : '—' }}<span v-if="p.referralCode" class="faint ltr"> · کد {{ p.referralCode }}</span></span></div>
            <div class="kv"><span class="k">موجودی کیف پول</span><span class="v"><template v-if="p.wallet != null">{{ money(p.wallet) }}</template><span v-else class="faint">در دسترس نیست</span></span></div>
            <div class="kv"><span class="k">اعتبار باقی‌مانده</span><span class="v">{{ n(p.credits.aiTokens) }} توکن هوش مصنوعی · {{ n(p.credits.sms) }} پیامک · {{ n(p.credits.email) }} ایمیل</span></div>
            <div class="kv"><span class="k">اتصال به بله</span><span class="v">{{ p.baleConnected ? 'وصل است' : 'وصل نیست' }}</span></div>

            <div class="sub-h">ورود و دستگاه‌ها <span class="faint" style="font-weight: 400">· {{ p.sessionCount ? fa(p.sessionCount) + ' نشست باز' : 'نشست بازی ندارد' }}</span></div>
            <div v-for="(x, i) in p.sessions" :key="i" class="kv"><span class="k">{{ x.device || 'دستگاه نامشخص' }}<span v-if="x.ip" class="faint ltr"> · {{ x.ip }}</span></span><span class="v">{{ dateTime(x.lastUse) }}</span></div>
          </PanelCard>
          <PanelCard :title="'چرا امتیاز سلامت ' + fa(a.health) + ' است؟'" :hint="bandLabel">
            <div v-for="c in HEALTH_COMPONENTS" :key="c.key" class="comp"><span>{{ c.label }}</span><span class="tr"><i :style="{ width: (a.components[c.key] / 20) * 100 + '%', background: c.key === d.weakest ? 'var(--serious)' : undefined }" /></span><b>{{ n(a.components[c.key]) }}</b><q-tooltip>{{ c.desc }}</q-tooltip></div>
            <div class="banner info" style="margin-top: 12px"><AppIcon name="target" /><div><b>قدم بعدی:</b> {{ d.nextStep }}</div></div>
          </PanelCard>
          <PanelCard title="سیگنال‌ها">
            <div class="kv"><span class="k">وضعیت سقف رکورد</span><span class="v"><span v-if="a.atLimit" class="sig limit">سقف پر شده · {{ a.maxUsage.label }}</span><span v-else-if="a.nearLimit" class="sig price">نزدیک سقف · {{ pct(a.maxUsage.ratio) }}</span><span v-else class="faint">عادی</span></span></div>
            <div class="kv"><span class="k">وضعیت پرداخت</span><span class="v"><span v-if="a.pastDue" class="sig due">پرداخت ناموفق</span><span v-else class="faint">بدون خطا</span></span></div>
            <div class="kv"><span class="k">تیکت پشتیبانی باز</span><span class="v"><span v-if="a.tickets" class="sig due">{{ fa(a.tickets) }}</span><template v-else>—</template></span></div>
            <div class="kv"><span class="k">آخرین نظرسنجی NPS</span><span class="v"><template v-if="a.nps != null">{{ fa(a.nps) }} از ۱۰ <StatusBadge v-if="a.nps >= 9" status="good" label="مروج" /><StatusBadge v-else-if="a.nps >= 7" status="warn" label="خنثی" /><StatusBadge v-else status="crit" label="منتقد" /></template><span v-else class="faint">پاسخ نداده</span></span></div>
            <div class="kv"><span class="k">دسته‌ها</span><span class="v"><template v-if="a.segments.length"><router-link v-for="k in a.segments" :key="k" class="tag" :to="'/segments?seg=' + k" style="margin-inline-start: 4px">{{ SEGMENT_LABEL[k] }}</router-link></template><template v-else>—</template></span></div>
          </PanelCard>
          <PanelCard title="مصرف پلن" :hint="'پلن ' + PLAN_NAME[a.plan]">
            <div class="stack" style="gap: 10px"><UsageMeter v-for="u in a.usage.filter((x) => x.limit)" :key="u.key" :label="u.label" :used="u.used" :limit="u.limit" :fmt="u.key === 'storage' ? (v) => n(v, 1) : undefined" /></div>
          </PanelCard>
          <PanelCard title="قابلیت‌ها" hint="وضعیت استفاده در ۹۰ روز اخیر">
            <div v-for="f in d.featureList" :key="f.key" class="kv"><span class="k" :style="{ color: a.feat[f.key] ? 'var(--ink)' : 'var(--faint)' }">{{ f.label }}</span><span class="v"><StatusBadge v-if="a.feat[f.key]" status="good" label="استفاده شده" /><span v-else class="badge">استفاده نشده</span></span></div>
          </PanelCard>
        </div>
      </div>

      <!-- activity -->
      <template v-if="tab === 'activity'">
        <div class="grid g2">
          <PanelCard title="ویرایش در روز" :hint="fa(d.ev120.length) + ' روز'"><ColumnChart v-if="d.ev120.length" :options="ev120" /><div v-else class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div></PanelCard>
          <PanelCard title="کاربران فعال در روز" :hint="fa(d.au120.length || d.ev120.length) + ' روز · از ' + fa(a.memberCount) + ' عضو'"><ColumnChart v-if="d.au120.length" :options="au120" /><div v-else class="note">این بخش هنوز از بک‌اند داده نمی‌گیرد.</div></PanelCard>
        </div>
        <PanelCard v-if="a.wk.length" title="هفته‌های فعال از روز ثبت‌نام" :hint="fa(a.wk.length) + ' هفته · ' + pct(a.wk.reduce((s, x) => s + x, 0) / a.wk.length) + ' فعال'">
          <SparkLine :values="a.wk" :w="Math.min(1100, a.wk.length * 14)" :h="34" bars />
          <div class="note" style="margin-top: 6px">هر ستون یک هفته است؛ ستون خاکستری یعنی آن هفته هیچ فعالیتی نبوده. <template v-if="a.decline">افت از حدود {{ agoDays(a.decline.start) }} شروع شده است.</template></div>
        </PanelCard>
      </template>

      <!-- members -->
      <template v-if="tab === 'members'">
        <PanelCard flush>
          <DataTable :rows="d.members" :columns="memberCols" :page-size="25" unit="عضو" :export-name="'members-' + a.slug" :sort="{ key: 'lastSeen', dir: 'asc' }">
            <template #col-name="{ row }"><span class="row"><span class="avatar">{{ initials(row.name) }}</span><b>{{ row.name }}</b></span></template>
            <template #col-mobile="{ row }"><a v-if="row.mobile" class="ltr" :href="'tel:' + row.mobile">{{ fa(row.mobile) }}</a><span v-else class="faint">—</span></template>
            <template #col-role="{ row }"><span v-if="row.role === 'مالک'" class="badge st-info">{{ row.role }}</span><template v-else>{{ row.role }}</template></template>
            <template #col-joined="{ row }"><template v-if="row.joined != null">{{ date(row.joined, { year: true }) }}</template><span v-else class="faint">—</span></template>
            <template #col-lastSeen="{ row }"><LastSeen :a="row" /></template>
            <template #col-active="{ row }"><StatusBadge v-if="row.online" status="good" label="آنلاین" /><StatusBadge v-else-if="row.lastSeen <= 6" status="good" label="فعال" /><span v-else class="faint">غیرفعال</span></template>
          </DataTable>
        </PanelCard>
        <div class="note">سقف پلن و تعداد همکار خریداری‌شده در کارت «اعضای فعال» بالای صفحه آمده است.</div>
      </template>

      <!-- bases -->
      <PanelCard v-if="tab === 'bases'" flush>
        <div style="padding: 12px 16px 0; font-size: 12.5px"><b>{{ fa(a.bases) }}</b> بیس ساخته<template v-if="a.coOwnedBases"> · <b>{{ fa(a.coOwnedBases) }}</b> مالک</template><template v-if="a.sharedBases"> · <b>{{ fa(a.sharedBases) }}</b> اشتراکی</template><span class="faint"> — سقف تعداد بیس پلن فقط بیس‌های ساخته‌شده را می‌شمارد</span></div>
        <DataTable :rows="d.bases" :columns="baseCols" unit="بیس" :export-name="'bases-' + a.slug" :sort="{ key: 'records', dir: 'desc' }" :on-row="(b) => router.push('/bases/' + b.id)" empty-title="هنوز بیسی نساخته" :empty="'این مشتری ثبت‌نام کرده ولی بیسی نساخته است — ایمیل تمپلیت‌های صنعت ' + a.industryName + ' را بفرستید.'">
          <template #col-name="{ row }"><router-link class="nm" :to="'/bases/' + row.id">{{ row.name }}</router-link></template>
          <template #col-role="{ row }"><span v-if="!row.role || row.role === 'creator'">سازنده</span><template v-else>{{ ROLE_LABEL[row.role] }}<router-link v-if="row.creatorId" class="s" :to="'/customers/' + row.creatorId" @click.stop>بیسِ {{ row.creatorName }}</router-link></template></template>
          <template #col-tables="{ row }">{{ n(row.tables) }}</template>
          <template #col-records="{ row }">{{ n(row.records) }}</template>
          <template #col-automations="{ row }">{{ n(row.automations) }}</template>
          <template #col-portals="{ row }">{{ n(row.portals) }}</template>
          <template #col-collaborators="{ row }">{{ n(row.collaborators) }}</template>
          <template #col-created="{ row }">{{ date(row.created, { year: true }) }}</template>
          <template #col-lastActive="{ row }">{{ agoDays(row.lastActive) }}</template>
        </DataTable>
      </PanelCard>

      <!-- billing -->
      <div v-if="tab === 'billing'" class="grid g-main">
        <PanelCard flush>
          <DataTable :rows="d.invoices.slice().reverse()" :columns="invoiceCols" unit="فاکتور" :export-name="'invoices-' + a.slug" :sort="{ key: 't', dir: 'asc' }" empty-title="فاکتوری نیست" empty="این مشتری هنوز خریدی نداشته است.">
            <template #col-t="{ row }">{{ date(row.t, { year: true }) }}</template>
            <template #col-plan="{ row }"><PlanBadge v-if="row.plan" :plan="row.plan" /><span v-else class="faint">بسته/خدمات</span></template>
            <template #col-amount="{ row }">{{ n(row.amount) }}</template>
            <template #col-status="{ row }"><StatusBadge v-if="row.status === 'paid'" status="good" label="پرداخت شد" /><StatusBadge v-else-if="row.status === 'pending'" status="warn" label="در انتظار پرداخت" /><StatusBadge v-else status="crit" :label="'ناموفق' + (row.retries ? ' · ' + fa(row.retries) + ' تلاش' : '')" /></template>
          </DataTable>
        </PanelCard>
        <div class="stack">
          <PanelCard title="اشتراک">
            <template v-if="a.paying">
              <div class="kv"><span class="k">پلن</span><span class="v"><PlanBadge :plan="a.plan" /></span></div>
              <div class="kv"><span class="k">دورهٔ پرداخت</span><span class="v">{{ CYCLE_NAME[a.cycle] || '—' }}<template v-if="d.cycleDiscount"> ({{ pct(d.cycleDiscount) }} تخفیف)</template></span></div>
              <div v-if="a.seats" class="kv"><span class="k">همکار خریداری‌شده</span><span class="v">{{ fa(a.seats) }}</span></div>
              <div class="kv"><span class="k">درآمد ماهانه</span><span class="v">{{ money(a.mrr) }}</span></div>
              <div class="kv"><span class="k">تمدید بعدی</span><span class="v">{{ date(-a.renewIn, { year: true }) }} · {{ inDays(a.renewIn) }}</span></div>
            </template>
            <div v-else class="note">{{ a.everPaid ? 'این مشتری قبلاً پرداخت می‌کرد و اکنون روی پلن رایگان است.' : 'هنوز پرداختی نداشته است.' }}</div>
          </PanelCard>
          <PanelCard title="تغییرات پلن">
            <div v-if="d.planEvents.length" class="tl">
              <div v-for="(e, i) in d.planEvents" :key="i" class="ev" :class="e.cls"><div class="t">{{ date(e.t, { year: true }) }} — {{ e.title }}</div><div class="d"><template v-if="e.kind === 'churn'">{{ a.churnReason || '' }}</template><template v-else>پلن {{ PLAN_NAME[e.plan] }} · {{ fa(e.seats) }} همکار · {{ CYCLE_NAME[e.cycle] }} · {{ money(e.mrr) }} در ماه</template></div></div>
            </div>
            <div v-else class="note">تغییری ثبت نشده.</div>
          </PanelCard>
        </div>
      </div>

      <!-- log -->
      <PanelCard v-if="tab === 'log'" title="تعامل‌ها" hint="تماس، ایمیل، جلسه و قرارداد" flush>
        <template #actions><button class="btn sm" @click="dialogs.addNote(a)"><AppIcon name="note" />یادداشت</button><button class="btn sm primary" @click="dialogs.logCall(a)"><AppIcon name="phone" />ثبت تماس</button></template>
        <div v-if="d.log.length" class="list" style="padding: 0 16px">
          <div v-for="(r, i) in d.log" :key="i" class="li"><span class="tag">{{ r.kind }}</span><span class="main"><span class="t" style="font-weight: 600">{{ r.what }}</span><span class="d">{{ r.who }}</span></span><span class="end faint">{{ r.local ? 'همین مرورگر' : agoDays(r.t) + ' ' + clock(r.min) }}</span></div>
        </div>
        <div v-else class="empty"><b>هنوز تعاملی ثبت نشده</b>اولین تماس را ثبت کنید تا همکاران هم ببینند.</div>
      </PanelCard>
    </template>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageShell from 'components/PageShell.vue'
import PanelCard from 'components/PanelCard.vue'
import KpiTile from 'components/KpiTile.vue'
import DataTable from 'components/DataTable.vue'
import AppIcon from 'components/AppIcon.vue'
import PlanBadge from 'components/PlanBadge.vue'
import StatusBadge from 'components/StatusBadge.vue'
import LastSeen from 'components/LastSeen.vue'
import DeltaChip from 'components/DeltaChip.vue'
import UsageMeter from 'components/UsageMeter.vue'
import ColumnChart from 'components/charts/ColumnChart.vue'
import SparkLine from 'components/charts/SparkLine.vue'
import { api } from 'src/api'
import { useAsync } from 'src/composables/useAsync'
import { useQueryParam } from 'src/composables/useUrlState'
import { useDialogs } from 'src/composables/useDialogs'
import { useUiStore } from 'stores/ui'
import { n, fa, pct, compact, compactParts as cp, money, date, dateTime, ago, agoDays, inDays, clock, initials, daysAgo, signupDaysAgo, CURRENCY } from 'src/lib/format'
import { CYCLE_NAME, HEALTH_COMPONENTS, SEGMENT_LABEL, sourceName } from 'src/lib/refs'
import { PLAN_NAME, band, toast } from 'src/lib/ui'

const route = useRoute(), router = useRouter(), ui = useUiStore(), dialogs = useDialogs()
const tab = useQueryParam('tab', 'summary')
const { data: d, loading, error } = useAsync(() => api.customer(route.params.id), [() => route.params.id])
const { data: jr, loading: jLoading, error: jError } = useAsync(() => api.customerJourney(route.params.id), [() => route.params.id])
const stepTime = (e) => (e.at ? Date.parse(e.at) : Date.now() - e.t * 864e5)
const journey = computed(() => [...d.value.timeline, ...(jr.value ? jr.value.steps : [])].sort((p, q) => stepTime(p) - stepTime(q)))
const a = computed(() => d.value.account)
const p = computed(() => d.value.profile)
const copy = (v) => navigator.clipboard.writeText(v).then(() => toast('کپی شد'), () => toast('کپی نشد'))
const bandLabel = computed(() => band(a.value.health).label)
const tabs = computed(() => [
  { key: 'summary', label: 'خلاصه' }, { key: 'activity', label: 'فعالیت' },
  { key: 'members', label: 'اعضا', n: a.value.memberCount }, { key: 'bases', label: 'بیس‌ها', n: a.value.bases + (a.value.coOwnedBases || 0) + (a.value.sharedBases || 0) },
  { key: 'billing', label: 'مالی', n: d.value.invoices.length }, { key: 'log', label: 'تعامل‌ها', n: d.value.log.length },
])

const labels = (days) => { const l = []; for (let i = days - 1; i >= 0; i--) l.push(date(i)); return l }
// the mock gives 120 days, the backend 90: size the charts by what came back
const act90 = computed(() => { const v = d.value.ev120.slice(-90); return { labels: labels(v.length), xEvery: 15, series: [{ name: 'ویرایش', values: v }], height: 190 } })
const ev120 = computed(() => ({ labels: labels(d.value.ev120.length), xEvery: 20, series: [{ name: 'ویرایش', values: d.value.ev120 }], height: 200 }))
const au120 = computed(() => ({ labels: labels(d.value.au120.length), xEvery: 20, series: [{ name: 'کاربر فعال', values: d.value.au120 }], height: 200 }))

const memberCols = [
  { key: 'name', label: 'عضو', csv: (m) => m.name },
  { key: 'role', label: 'نقش', csv: (m) => m.role },
  { key: 'mobile', label: 'موبایل', sort: false, csv: (m) => m.mobile || '' },
  { key: 'joined', label: 'عضو از', sort: (m) => -(m.joined ?? 0), csv: (m) => (m.joined != null ? date(m.joined, { year: true }) : '') },
  { key: 'lastSeen', label: 'آخرین فعالیت', csv: (m) => m.lastSeen },
  { key: 'active', label: 'این هفته', sort: (m) => (m.lastSeen <= 6 ? 1 : 0), csv: (m) => (m.lastSeen <= 6 ? 'فعال' : 'غیرفعال') },
]
const ROLE_LABEL = { creator: 'سازنده', owner: 'مالک', collaborator: 'همکار' }
const baseCols = [
  { key: 'name', label: 'بیس', csv: (b) => b.name },
  { key: 'role', label: 'نقش', sort: (b) => ['creator', 'owner', 'collaborator'].indexOf(b.role), csv: (b) => ROLE_LABEL[b.role || 'creator'] + (b.creatorName ? ' · ' + b.creatorName : '') },
  { key: 'tables', label: 'جدول', num: true },
  { key: 'records', label: 'رکورد', num: true },
  { key: 'automations', label: 'خودکارسازی', num: true },
  { key: 'portals', label: 'درگاه', num: true },
  { key: 'collaborators', label: 'همکار', num: true },
  { key: 'created', label: 'ساخته‌شده', sort: (b) => -b.created, csv: (b) => date(b.created, { year: true }) },
  { key: 'lastActive', label: 'آخرین فعالیت', sort: (b) => -b.lastActive, csv: (b) => b.lastActive },
]
const invoiceCols = [
  { key: 't', label: 'تاریخ', csv: (v) => date(v.t, { year: true }) },
  { key: 'plan', label: 'پلن', csv: (v) => PLAN_NAME[v.plan] },
  { key: 'amount', label: 'مبلغ (تومان)', num: true },
  { key: 'status', label: 'وضعیت', csv: (v) => v.status },
]
</script>
