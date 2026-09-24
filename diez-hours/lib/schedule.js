export const TZ = 'Europe/Amsterdam';

// Horario habitual. 0 = domingo, 1 = lunes ... 6 = sábado.
// Ajusta días y horas a los reales de la galería.
export const REGULAR_HOURS = {
  5: { from: '13:00', until: '18:00' }, // viernes
  6: { from: '12:00', until: '17:00' }, // sábado
  0: { from: '12:00', until: '17:00' }, // domingo
};

// Cuántos días hacia delante se calculan.
export const HORIZON_DAYS = 60;

// Fecha y hora actuales en Ámsterdam (con horario de verano incluido).
export function amsterdamNow(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function weekday(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// overrides: Map<'YYYY-MM-DD', { status: 'Open'|'Closed', from, until, note }>
export function buildSchedule(overrides, today = amsterdamNow().date) {
  const openings = [];
  const closures = [];

  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const date = addDays(today, i);
    const o = overrides.get(date);
    const regular = REGULAR_HOURS[weekday(date)];

    if (o?.status === 'Closed') {
      closures.push({ date, note: o.note || null });
      continue;
    }
    if (o?.status === 'Open') {
      openings.push({
        date,
        from: o.from || regular?.from || '12:00',
        until: o.until || regular?.until || '18:00',
        note: o.note || null,
      });
      continue;
    }
    if (regular) openings.push({ date, from: regular.from, until: regular.until, note: null });
  }

  return { timezone: TZ, today, openings, closures };
}
