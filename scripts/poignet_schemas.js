#!/usr/bin/env node
/* RadiologicHub — écrit les schémas SVG de la fiche « Fractures de l'extrémité distale du radius »
   (fiches/poignet/schemas.js) entre les marqueurs <!-- GEN:nom --> … <!-- /GEN:nom --> de la page.
   Usage : node scripts/poignet_schemas.js */
const fs = require('fs');
const path = require('path');
const S = require('../fiches/poignet/schemas.js');

const PAGE = path.join(__dirname, '..', 'fiches', 'fractures-radius-distal.html');
const SCHEMAS = {
  face: S.face(),
  'profil-normal': S.profil({ seuil: true, titre: 'PROFIL', aria: 'Poignet de profil, schéma : inclinaison palmaire normale' }),
  'profil-colles': S.profil({ tilt: -25, dx: 10, titre: false, aria: 'Pouteau-Colles de profil, schéma : bascule dorsale du fragment distal, carpe déporté en dorsal' }),
  'profil-smith': S.profil({ tilt: 30, dx: -12, titre: false, aria: 'Goyrand-Smith de profil, schéma : bascule palmaire du fragment distal' }),
  'profil-barton': S.profil({ barton: 'palmaire', titre: false, aria: 'Barton palmaire de profil, schéma : fracture du rebord palmaire, carpe subluxé en palmaire' }),
};
let html = fs.readFileSync(PAGE, 'utf8');
for (const [nom, svg] of Object.entries(SCHEMAS)) {
  const re = new RegExp(`<!-- GEN:${nom} -->[\\s\\S]*?<!-- /GEN:${nom} -->`);
  if (!re.test(html)) { console.error('marqueur absent :', nom); process.exit(1); }
  html = html.replace(re, `<!-- GEN:${nom} -->${svg}<!-- /GEN:${nom} -->`);
}
fs.writeFileSync(PAGE, html);
console.log('schémas écrits :', Object.keys(SCHEMAS).join(', '));
