import { createHash, timingSafeEqual } from 'node:crypto';
import { listOverrides, upsertOverride, deleteOverride } from '../lib/airtable.js';
import { amsterdamNow, buildSchedule, REGULAR_HOURS } from '../lib/schedule.js';
import { googleEnabled, syncGoogle } from '../lib/google.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const RECORD = /^rec[a-zA-Z0-9]{14}$/;

function authorized(req) {
  const expected = process.env.ADMIN_KEY || '';
  if (!expected) return false;
  const given = String(req.headers['x-admin-key'] || '');
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

// Tras cada cambio, manda las excepciones futuras a Google Maps.
// Un fallo de Google nunca bloquea el cambio en la web.
async function syncAfterChange() {
  if (!googleEnabled()) return 'off';
  try {
    await syncGoogle(await listOverrides(amsterdamNow().date));
    return 'synced';
  } catch (e) {
    console.error(e);
    return 'failed';
  }
}

function validate(body) {
  const { date, status, from, until, note } = body || {};
  if (!DATE.test(date || '')) return 'Invalid date';
  if (!['Open', 'Closed'].includes(status)) return 'Status must be Open or Closed';
  if (status === 'Open') {
    if (from && !TIME.test(from)) return 'Invalid opening time';
    if (until && !TIME.test(until)) return 'Invalid closing time';
    if (from && until && from >= until) return 'Closing time must be after opening time';
  }
  if (note && String(note).length > 140) return 'Note is longer than 140 characters';
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req)) return res.status(401).json({ error: 'Wrong key' });

  try {
    if (req.method === 'GET') {
      const today = amsterdamNow().date;
      const overrides = await listOverrides(today);
      const schedule = buildSchedule(new Map(overrides.map((o) => [o.date, o])), today);
      return res.status(200).json({ today, regular: REGULAR_HOURS, overrides, schedule, google: googleEnabled() });
    }

    if (req.method === 'POST') {
      const error = validate(req.body);
      if (error) return res.status(400).json({ error });
      const { date, status, from, until, note } = req.body;
      await upsertOverride({
        date,
        status,
        from: status === 'Open' ? from : '',
        until: status === 'Open' ? until : '',
        note: String(note || '').trim(),
      });
      return res.status(200).json({ ok: true, google: await syncAfterChange() });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!RECORD.test(id)) return res.status(400).json({ error: 'Invalid record id' });
      await deleteOverride(id);
      return res.status(200).json({ ok: true, google: await syncAfterChange() });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).end();
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: 'Airtable request failed' });
  }
}
