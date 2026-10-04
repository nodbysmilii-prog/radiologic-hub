# RadiologicHub

Site vitrine des masterclass de radiologie d'urgence (neuro, digestif, thorax, polytraumatisé, vasculaire, pédiatrie).

Site statique (HTML / CSS / JS, sans dépendance) : ouvrez `index.html` dans un navigateur, ou déployez le dossier tel quel (GitHub Pages, Netlify, Vercel…).

## Structure

- `index.html` : contenu des sections (hero, masterclass, format, programme, tarifs, FAQ, inscription)
- `styles.css` : styles, couleurs reprises du logo (variables dans `:root`)
- `script.js` : liste des masterclass (tableau `COURSES`), filtres, fenêtre de détail, menu mobile, formulaire
- `assets/` : logo original (`logo-radiologichub.png`) et emblème vectoriel (`emblem.svg`, `emblem-light.svg` pour fond sombre)

## À personnaliser

- **Masterclass** : modifier ou ajouter des entrées dans `COURSES` (`script.js`).
- **Tarifs, programme, FAQ** : textes indicatifs dans `index.html`.
- **Formulaire** : l'envoi n'est pas encore branché (voir le `TODO` dans `script.js`) — à connecter à Formspree, Netlify Forms ou un back-end.
