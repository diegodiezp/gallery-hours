import { listOverrides } from '../lib/airtable.js';
import { amsterdamNow, buildSchedule } from '../lib/schedule.js';

// Público y de solo lectura. Devuelve el calendario, no el estado:
// el navegador calcula abierto/cerrado minuto a minuto, así la caché
// nunca muestra "open" pasada la hora de cierre.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const today = amsterdamNow().date;
    const list = await listOverrides(today);
    const schedule = buildSchedule(new Map(list.map((o) => [o.date, o])), today);
    // CDN de Vercel: Airtable recibe como mucho una petición por minuto.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(schedule);
  } catch (e) {
    console.error(e);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ error: 'Schedule unavailable' });
  }
}
