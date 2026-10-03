/* HTTP implementation of the API contract (cloud-back, REST under /management).
   One file per page mirrors src/api/mock; each function returns the same shape as its mock twin. */
export * from './local'
export { customersAll, accountById, PLANS, planKey } from './account'
export * from './overview'
export * from './customers'
export * from './customer'
export * from './health'
export * from './segments'
export * from './onboarding'
export * from './revenue'
export * from './sales'
export * from './funnel'
export * from './acquisition'
export * from './retention'
export * from './features'
export * from './journey'
export * from './bases'
export * from './base'
export * from './quota'
export * from './jobs'
export * from './dataHealth'
export * from './settings'

/** Pages with no backend data at all: hidden from the menu, their route shows the "not implemented" banner. */
export const UNAVAILABLE = new Set(['ai'])
export const NEEDS_AUTH = true
const notReady = (name) => () => Promise.reject(new Error('دادهٔ «' + name + '» هنوز در بک‌اند ساخته نشده است'))
export const aiBrief = notReady('تحلیل هوشمند')
