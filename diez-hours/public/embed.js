/* diez hours: estado abierto/cerrado para diez.gallery (Cargo 3)
   Contenedor: <div class="diez-hours-slot">texto de respaldo</div>
   Opcional: data-clock="false" para ocultar la fecha y la hora.
   Si la API falla, el texto de respaldo se queda tal cual. */
(function () {
  var script = document.currentScript;
  var API = (script && script.dataset.api) ||
    (script && script.src ? new URL(script.src).origin : 'https://hours.diez.gallery') + '/api/status';
  var TZ = 'Europe/Amsterdam';
  var SELECTOR = '.diez-hours-slot, [data-diez-hours]';
  var data = null;

  var style = document.createElement('style');
  style.textContent =
    '.diez-hours{font:inherit;color:inherit}' +
    '.diez-hours>span{display:block}' +
    '.diez-hours .dh-state::before{content:"";display:inline-block;width:.5em;height:.5em;' +
    'border-radius:50%;margin-right:.4em;vertical-align:.08em;background:currentColor;opacity:.3}' +
    '.diez-hours.is-open .dh-state::before{background:#0a7a3d;opacity:1}' +
    '.diez-hours .dh-note{opacity:.7}';
  document.head.appendChild(style);

  function nowAms() {
    var p = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute };
  }

  // '13:00' -> '1pm', '12:30' -> '12:30pm', '00:15' -> '12:15am'
  function t12(hhmm) {
    var h = +hhmm.slice(0, 2), m = hhmm.slice(3);
    var suffix = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + (m === '00' ? '' : ':' + m) + suffix;
  }

  function isoToDate(iso) {
    var a = iso.split('-').map(Number);
    return new Date(Date.UTC(a[0], a[1] - 1, a[2], 12));
  }
  function daysBetween(a, b) { return Math.round((isoToDate(b) - isoToDate(a)) / 86400000); }
  function fmt(iso, opts) {
    return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: 'UTC' }, opts)).format(isoToDate(iso));
  }

  function computeStatus(now) {
    var today = data.openings.find(function (o) { return o.date === now.date; });
    if (today && now.time >= today.from && now.time < today.until) {
      return { open: true, until: today.until, note: today.note };
    }
    var next = data.openings.find(function (o) {
      return o.date > now.date || (o.date === now.date && o.from > now.time);
    });
    var closure = data.closures.find(function (c) { return c.date === now.date; });
    return { open: false, next: next, note: closure ? closure.note : null };
  }

  function stateText(s, now) {
    if (s.open) return 'Open until ' + t12(s.until) + '.';
    if (!s.next) return 'Closed. Visits by appointment.';
    var d = daysBetween(now.date, s.next.date);
    var when =
      d === 0 ? 'today' :
      d === 1 ? 'tomorrow' :
      d < 7 ? fmt(s.next.date, { weekday: 'long' }) :
      fmt(s.next.date, { weekday: 'long', day: 'numeric', month: 'long' });
    return 'Closed. Opens ' + when + ' at ' + t12(s.next.from) + '.';
  }

  function add(parent, cls, text) {
    var span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    parent.appendChild(span);
  }

  function render() {
    if (!data) return;
    var now = nowAms();
    var s = computeStatus(now);
    var clock = fmt(now.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + t12(now.time);
    var state = stateText(s, now);

    document.querySelectorAll(SELECTOR).forEach(function (el) {
      el.classList.add('diez-hours');
      el.classList.toggle('is-open', s.open);
      el.textContent = '';
      if (el.dataset.clock !== 'false') add(el, 'dh-clock', clock);
      add(el, 'dh-state', state);
      if (s.note) add(el, 'dh-note', s.note);
    });
  }

  function load() {
    fetch(API)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { data = j; render(); })
      .catch(function () { /* se queda el texto de respaldo */ });
  }

  load();
  setInterval(render, 20000);
  setInterval(load, 5 * 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });

  // Cargo 3 pinta las páginas después de cargar y al navegar: montar en contenedores nuevos.
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      for (var j = 0; j < muts[i].addedNodes.length; j++) {
        var n = muts[i].addedNodes[j];
        if (n.nodeType === 1 && (n.matches(SELECTOR) || n.querySelector(SELECTOR))) return render();
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
