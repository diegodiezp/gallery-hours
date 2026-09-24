const BASE = process.env.AIRTABLE_BASE_ID;
const TABLE = encodeURIComponent(process.env.AIRTABLE_TABLE || 'tbloucTRBYsmiafAo');
const TOKEN = process.env.AIRTABLE_TOKEN;
const API = `https://api.airtable.com/v0/${BASE}/${TABLE}`;

async function at(path = '', opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`Airtable ${r.status}: ${await r.text()}`);
  return r.json();
}

const toOverride = (r) => ({
  id: r.id,
  date: r.fields.Date,
  status: r.fields.Status,
  from: r.fields.From || null,
  until: r.fields.Until || null,
  note: r.fields.Note || null,
});

// Todas las excepciones desde fromDate (incluida) en adelante.
export async function listOverrides(fromDate) {
  const records = [];
  let offset;
  do {
    const q = new URLSearchParams({
      filterByFormula: `NOT(IS_BEFORE({Date}, '${fromDate}'))`,
      'sort[0][field]': 'Date',
      'sort[0][direction]': 'asc',
      pageSize: '100',
    });
    if (offset) q.set('offset', offset);
    const j = await at('?' + q);
    records.push(...j.records);
    offset = j.offset;
  } while (offset);
  return records.filter((r) => r.fields.Date).map(toOverride);
}

async function findByDate(date) {
  const q = new URLSearchParams({
    filterByFormula: `DATETIME_FORMAT({Date}, 'YYYY-MM-DD') = '${date}'`,
    maxRecords: '1',
  });
  const j = await at('?' + q);
  return j.records[0] || null;
}

// Una sola excepción por fecha: si ya existe, se sobrescribe.
export async function upsertOverride({ date, status, from, until, note }) {
  const fields = { Date: date, Status: status, From: from || '', Until: until || '', Note: note || '' };
  const existing = await findByDate(date);
  if (existing) {
    return at(`/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ fields, typecast: true }) });
  }
  return at('', { method: 'POST', body: JSON.stringify({ records: [{ fields }], typecast: true }) });
}

export function deleteOverride(id) {
  return at(`/${id}`, { method: 'DELETE' });
}
