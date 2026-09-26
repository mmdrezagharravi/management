/* The only door between pages and data.
   Every function returns a Promise of plain objects/arrays with stable English
   keys; Persian labels live in the components. API_MODE=http (default) talks to
   cloud-back; API_MODE=mock uses the seeded mock world. Pages never change. */
const mod = process.env.API_MODE === 'mock' ? await import('./mock') : await import('./http')

export const api = mod
export default api
