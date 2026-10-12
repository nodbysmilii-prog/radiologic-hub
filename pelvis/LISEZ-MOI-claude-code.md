# Consignes pour Claude Code

Ce dossier contient la section « Pelvis » de mon site : un fichier Markdown par fiche.

- `00-sommaire.md` : page d'accueil de la section.
- `ovaire/00-ovaire.md` : page du chapitre Ovaire ; `ovaire/01` à `ovaire/20` : une fiche par page, dans l'ordre de lecture.
- `ovaire/schema-demarche-masse.jsx` : schéma (arbre de décision IRM) de la fiche 08, à convertir en SVG statique aux couleurs du site, en gardant les textes à l'identique.
- `sources.md` : références utilisées.

## À faire

1. Structure : `/pelvis` (sommaire, trois entrées : par organe, par situation clinique, par classification), `/pelvis/ovaire` (liste des fiches dans l'ordre), `/pelvis/ovaire/<fiche>` (une page par fichier). Les chapitres « À venir » restent affichés, sans lien. Dans le sommaire et la page Ovaire, transforme les noms de fiches en liens vers leurs pages.
2. Garde exactement le texte et les tableaux : ne reformule rien, ne traduis rien, termes médicaux en français tels qu'écrits.
3. Le paragraphe « En bref » s'affiche en encadré en haut de la fiche.
4. Navigation : fil d'Ariane (Pelvis > Ovaire > fiche), fiche précédente / suivante, sommaire latéral sur ordinateur, menu repliable sur mobile ; tableaux en défilement horizontal sur mobile.
5. Les fiches 09 (O-RADS échographie) et 10 (O-RADS IRM) apparaissent aussi dans `/pelvis/classifications`, à côté du Bosniak.
6. Recherche sur les titres et le contenu des fiches.
7. Bas de chaque fiche : un lien « Sources » vers `/pelvis/sources`.
8. Titre et meta description par fiche.
9. Respecte la charte du site, vérifie sur mobile et montre-moi le résultat avant de déployer.
