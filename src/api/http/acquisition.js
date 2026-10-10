/* GET /management/acquisition?range — site visits per channel from Google Analytics 4 (up to yesterday) and signups from our DB.
   Same shape as mock/acquisition.js. Signups carry a source only when invited, so there is no per-channel signup rate. */
import { get } from "./client";

export const acquisition = ({ range = 30 } = {}) =>
  get("/acquisition", { range });
