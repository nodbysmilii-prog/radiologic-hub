/* =========================================================
   RadiologicHub — Remplacements : fichier agenda (.ics)
   ---------------------------------------------------------
   Un événement par date de la mission, à l'heure de Tunis (fuseau
   Africa/Tunis déclaré dans le fichier). Une garde qui finit à une heure
   antérieure à son début se termine le lendemain.
   Format iCalendar (RFC 5545) : lignes CRLF, repliées à 75 octets.
   ========================================================= */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.RHRemplacements = root.RHRemplacements || {}).ics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const echapper = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  /* Repli des lignes longues (75 octets, la suite commence par une espace) */
  function replier(ligne) {
    const enc = new TextEncoder(), out = [];
    let cour = '', n = 0;
    for (const ch of ligne) {
      const t = enc.encode(ch).length;
      if (n + t > (out.length ? 74 : 75)) { out.push(cour); cour = ''; n = 0; }
      cour += ch; n += t;
    }
    out.push(cour);
    return out.join('\r\n ');
  }
  const compact = (date, heure) => `${date.replace(/-/g, '')}T${heure.replace(':', '')}00`;
  const lendemain = date => { const [a, m, j] = date.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1, j + 1)); return d.toISOString().slice(0, 10); };
  const horodatage = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  /*
   * calendrier({ uid, titre, lieu, description, dates, heure_debut, heure_fin, annule, maintenant })
   * → texte du fichier .ics
   */
  function calendrier(o) {
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RadiologicHub//Remplacements//FR', 'CALSCALE:GREGORIAN', `METHOD:${o.annule ? 'CANCEL' : 'PUBLISH'}`,
      'BEGIN:VTIMEZONE', 'TZID:Africa/Tunis', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'END:STANDARD', 'END:VTIMEZONE'];
    const fin = o.heure_fin <= o.heure_debut;
    [...o.dates].sort().forEach(date => {
      L.push('BEGIN:VEVENT',
        `UID:${o.uid}-${date}@radiologichub`,
        `DTSTAMP:${horodatage(o.maintenant || Date.now())}`,
        `DTSTART;TZID=Africa/Tunis:${compact(date, o.heure_debut)}`,
        `DTEND;TZID=Africa/Tunis:${compact(fin ? lendemain(date) : date, o.heure_fin)}`,
        `SUMMARY:${echapper(o.titre)}`);
      if (o.lieu) L.push(`LOCATION:${echapper(o.lieu)}`);
      if (o.description) L.push(`DESCRIPTION:${echapper(o.description)}`);
      L.push(`STATUS:${o.annule ? 'CANCELLED' : 'CONFIRMED'}`, `SEQUENCE:${o.annule ? 1 : 0}`, 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(replier).join('\r\n') + '\r\n';
  }

  return { calendrier, echapper };
});
