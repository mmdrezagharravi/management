const page = (name, file, meta = {}) => ({ path: meta.path ?? '/' + name, name, component: () => import(`pages/${file}.vue`), meta })

export default [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      page('overview', 'OverviewPage', { path: '' }),
      page('today', 'TodayPage'),
      page('ai', 'AiPage'),
      page('customers', 'CustomersPage'),
      page('customer', 'CustomerPage', { path: '/customers/:id', nav: 'customers' }),
      page('health', 'HealthPage'),
      page('segments', 'SegmentsPage'),
      page('onboarding', 'OnboardingPage'),
      page('revenue', 'RevenuePage'),
      page('sales', 'SalesPage'),
      page('team', 'TeamPage'),
      page('funnel', 'FunnelPage'),
      page('retention', 'RetentionPage'),
      page('acquisition', 'AcquisitionPage'),
      page('features', 'FeaturesPage'),
      page('journey', 'JourneyPage'),
      page('bases', 'BasesPage'),
      page('base', 'BasePage', { path: '/bases/:id', nav: 'bases' }),
      page('quota', 'QuotaPage'),
      page('jobs', 'JobsPage'),
      page('data-health', 'DataHealthPage'),
      page('settings', 'SettingsPage'),
    ],
  },
  { path: '/:catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
]
