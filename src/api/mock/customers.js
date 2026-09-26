/* GET /management/customers — every account as a list row. */
import { DB } from 'src/mock/engine'
import { ok, enrich } from './shared'

export function customers() {
  return ok({
    rows: DB.accounts.map(enrich),
    cities: [...new Set(DB.accounts.map((a) => a.city))],
  })
}
