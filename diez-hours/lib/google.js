import { REGULAR_HOURS, weekday } from './schedule.js';

const clean = (v) => String(v || '').trim();
const GOOGLE_CLIENT_ID = clean(process.env.GOOGLE_CLIENT_ID);
const GOOGLE_CLIENT_SECRET = clean(process.env.GOOGLE_CLIENT_SECRET);
const GOOGLE_REFRESH_TOKEN = clean(process.env.GOOGLE_REFRESH_TOKEN);
// Acepta "123", "locations/123" o la ruta completa "accounts/1/locations/123".
const GOOGLE_LOCATION_ID = clean(process.env.GOOGLE_LOCATION_ID).replace(/^.*locations\//, '');

// Qué falta para que la sincronización funcione. Vacío = lista.
export function googleStatus() {
  const missing = [];
  if (!GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!GOOGLE_REFRESH_TOKEN) missing.push('GOOGLE_REFRESH_TOKEN');
  if (!GOOGLE_LOCATION_ID) missing.push('GOOGLE_LOCATION_ID');
  else if (!/^\d+$/.test(GOOGLE_LOCATION_ID)) missing.push('GOOGLE_LOCATION_ID (must be a number)');
  return { enabled: missing.length === 0, missing };
}
export const googleEnabled = () => googleStatus().enabled;

async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) throw new Error(`Google token ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

const toDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
};
const toTime = (hhmm) => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return { hours, minutes };
};

// Excepciones de Airtable -> specialHourPeriods de Google.
export function toSpecialHours(overrides) {
  const specialHourPeriods = overrides
    .filter((o) => o.date && (o.status === 'Open' || o.status === 'Closed'))
    .map((o) => {
      const date = toDate(o.date);
      if (o.status === 'Closed') return { startDate: date, endDate: date, closed: true };
      const regular = REGULAR_HOURS[weekday(o.date)];
      const from = o.from || regular?.from || '12:00';
      const until = o.until || regular?.until || '18:00';
      return { startDate: date, endDate: date, openTime: toTime(from), closeTime: toTime(until) };
    });
  return { specialHourPeriods };
}

// Sustituye TODAS las horas especiales de la ficha por las excepciones futuras de Airtable.
// Airtable es la única fuente: no edites horas especiales a mano en Google.
export async function syncGoogle(overrides) {
  const token = await accessToken();
  const url =
    `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${GOOGLE_LOCATION_ID}` +
    `?updateMask=specialHours`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ specialHours: toSpecialHours(overrides) }),
  });
  if (!r.ok) throw new Error(`Google PATCH ${r.status}: ${await r.text()}`);
}
