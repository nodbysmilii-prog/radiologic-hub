%% =====================================================================
%% MODÈLE DE CONTRAT DE REMPLACEMENT — À FAIRE VALIDER AVANT USAGE
%% (juriste, Conseil national de l'Ordre des médecins de Tunisie).
%%
%% Ce fichier est le seul à modifier pour changer le texte du contrat.
%% Syntaxe :
%%   # Titre            (centré, en gros)
%%   > Sous-titre       (centré)
%%   ## Article         (intertitre)
%%   - puce
%%   ---                (trait horizontal)
%%   [SIGNATURES]       (cadres de signature des deux parties)
%%   **gras**  _italique_
%%   {{variable}}  et  {{#bloc}} … {{/bloc}} (affiché si la valeur existe)
%%   Les lignes qui commencent par %% ne sont pas imprimées.
%% Variables disponibles : voir remplacements/noyau/contrat.js (donneesContrat).
%% Les passages entre crochets [ … ] sont à compléter ou à valider.
%% =====================================================================

# CONTRAT DE REMPLACEMENT EN RADIOLOGIE
> Référence {{mission.reference}} — établi le {{date_contrat}}

---

## Entre les soussignés

**{{structure.nom}}**, {{structure.type}} de radiologie, sise {{structure.adresse}}, {{structure.ville}} (gouvernorat de {{structure.gouvernorat}}), représentée par {{structure.contact}}, téléphone {{structure.telephone}}, e-mail {{structure.email}}, ci-après « la structure »,

et **Dr {{remplacant.prenom}} {{remplacant.nom}}**, {{remplacant.statut}}, affecté(e) à {{remplacant.affectation}}, téléphone {{remplacant.telephone}}, e-mail {{remplacant.email}}, ci-après « le remplaçant ».

## Article 1 — Objet

La structure confie au remplaçant, qui l'accepte, l'activité de radiologie décrite ci-dessous, pour la période et dans les conditions fixées par le présent contrat. Le remplaçant exerce en toute indépendance professionnelle, dans le respect du Code de déontologie médicale.

## Article 2 — Période, horaires et activité

- Type de remplacement : {{mission.type}}
- Date(s) : {{mission.dates_texte}}
- Horaires : {{mission.horaires}}
- Modalités à assurer : {{mission.modalites}}
{{#mission.commentaire}}- Précisions : {{mission.commentaire}}{{/mission.commentaire}}

## Article 3 — Honoraires

Les honoraires sont fixés à un forfait de **{{mission.honoraires}} {{mission.unite}}**, soit **{{mission.total}}** pour l'ensemble de la mission ({{mission.nombre}}).

Modalités de règlement : [à préciser : mode de paiement, délai, retenue à la source éventuelle].

## Article 4 — Conditions matérielles

{{mission.conditions}}

## Article 5 — Obligations du remplaçant

- Assurer personnellement les examens et les comptes rendus relevant des modalités ci-dessus, pendant les horaires convenus.
- Respecter le secret médical et la confidentialité des données des patients.
- Être couvert par une assurance de responsabilité civile professionnelle en cours de validité [à vérifier].
{{#remplacant.resident}}- Disposer des autorisations requises pour effectuer ce remplacement en qualité de résident [à vérifier selon la réglementation en vigueur].{{/remplacant.resident}}

## Article 6 — Obligations de la structure

- Mettre à la disposition du remplaçant les équipements, le personnel paramédical et l'accès aux outils nécessaires (système d'information, archivage des images).
- L'informer des protocoles et de l'organisation du service.
- Régler les honoraires convenus.

## Article 7 — Annulation

Toute annulation doit être signalée sans délai à l'autre partie, par la plateforme RadiologicHub ou par écrit. [Préciser le délai de prévenance et les conséquences éventuelles d'une annulation tardive.]

## Article 8 — Litiges

Les parties s'efforcent de régler à l'amiable tout différend lié au présent contrat. À défaut : [instance compétente à préciser].

Fait en deux exemplaires, le {{date_contrat}}.

[SIGNATURES]
