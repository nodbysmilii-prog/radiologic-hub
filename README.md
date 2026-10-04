# RadiologicHub

Site vitrine des masterclass de radiologie d'urgence (neuro, digestif, thorax, polytraumatisé, vasculaire, pédiatrie).

Site statique (HTML / CSS / JS, sans dépendance) : ouvrez `index.html` dans un navigateur, ou déployez le dossier tel quel (GitHub Pages, Netlify, Vercel…).

## Structure

- `index.html` : contenu des sections (hero, masterclass, format, programme, tarifs, FAQ, inscription)
- `styles.css` : styles, couleurs reprises du logo (variables dans `:root`)
- `script.js` : masterclass (`COURSES`), quiz « Cas du jour » (`CASES`), fiche flash (`FLASH`), filtres, menu mobile, formulaire
- `assets/` : logo original, emblème vectoriel (`emblem.svg`, `emblem-light.svg`) et fiches RadiologicHub (`assets/posts/`)

## Charte

Montserrat (capitales, mots-clés marine `#2b2a74` / rouge `#a8172d`), Permanent Marker pour les titres soulignés, Michroma pour le logo. Fonds gris dégradés, cartes colorées (ambre, bleu, violet, sarcelle…), blobs dégradés : variables dans `:root` de `styles.css`.

## À personnaliser

- **Masterclass, cas du quiz, fiche flash** : tableaux `COURSES`, `CASES` et `FLASH` dans `script.js`.
- **Tarifs, programme, FAQ** : textes indicatifs dans `index.html`.
- **Formulaire** : l'envoi n'est pas encore branché (voir le `TODO` dans `script.js`) — à connecter à Formspree, Netlify Forms ou un back-end.

## Fiches rapides

- `fiches-rapides.html` : index des fiches, avec un onglet par spécialité. Pour ajouter une fiche, copier un bloc `<a class="fiche-card">` et changer `data-spe`, le lien, le titre et le résumé.
- `fiches/` : une page par fiche (ex. `fiches/adenocarcinome-pancreas.html`), styles dans `fiche.css`, interactions dans `fiche.js`.
- Code couleur des surlignages : `k-tech` (technique), `k-sign` (signe discriminant), `k-grave` (non-résécabilité / gravité), `k-ddx` (diagnostic différentiel / syndrome), `k-key` (à retenir).
