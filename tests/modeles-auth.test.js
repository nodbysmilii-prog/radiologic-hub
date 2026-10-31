/* Modèles d'e-mails de l'authentification Supabase (supabase/modeles-auth/) : à coller dans
   Authentication → Emails → Templates. Le lien Supabase doit rester intact et unique, aucune autre
   variable (une variable inconnue casse l'envoi), aucune image ni ressource externe, texte en français. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const D = path.join(__dirname, '..', 'supabase', 'modeles-auth');
const MODELES = { 'lien-connexion.html': 'Magic Link', 'confirmation-inscription.html': 'Confirm signup' };

for (const [f, nom] of Object.entries(MODELES)) {
  test(`modèle Auth « ${nom} » (${f}) : lien Supabase intact, aucune ressource externe, français`, () => {
    const t = fs.readFileSync(path.join(D, f), 'utf8');
    const corps = t.replace(/<!--[\s\S]*?-->/g, '');
    assert.deepEqual(corps.match(/\{\{[^}]*\}\}/g), ['{{ .ConfirmationURL }}'], 'une seule variable : {{ .ConfirmationURL }}');
    assert.match(corps, /<a href="\{\{ \.ConfirmationURL \}\}"/, 'le bouton pointe vers le lien Supabase');
    assert.doesNotMatch(corps, /<img|<link|<script|url\(|https?:\/\//i, 'aucune image, feuille de style, script ni adresse externe');
    assert.match(corps, /valable une heure/);
    assert.match(t, /Objet : .*RadiologicHub/, 'objet indiqué en commentaire');
    assert.match(corps, /lang|Bonjour/);
  });
}
