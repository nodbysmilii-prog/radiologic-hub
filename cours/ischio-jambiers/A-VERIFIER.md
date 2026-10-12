# À vérifier — ischio-jambiers (cours « Échoanatomie musculaire du membre inférieur »)

> Fichier **généré** par `node scripts/a_verifier.js` à partir de `schemas/ischio-jambiers.js` et de `public/models/ischio-jambiers/manifest.json`. Pour corriger : modifier les données, puis relancer le script.
> Chaque schéma et chaque modèle porte une **version** : la validation dans l'administration s'applique à une version ; toute modification la remet « À valider ».

## Conventions communes aux 6 schémas

- Coupes **transversales**, patient en **décubitus ventral**, sonde sur la face postérieure de la cuisse.
- Par défaut, **médial à gauche** de l'écran, en attendant d'aligner les schémas sur l'orientation de vos images ; bouton « Inverser gauche/droite ». Repères **M / L** (médial / latéral) et **S / P** (superficiel, côté sonde / profond) sur chaque schéma ; point orange = repère de la sonde, côté gauche de l'écran.
- Code commun : muscle ; conjonctif : cloison, aponévrose, tendon (hyperéchogène) ; nerf ; artère ; veine ; os : corticale et ombre acoustique ; graisse ; repère clé du schéma.
- Proportions schématiques (environ 68 px par cm) : épaisseurs et profondeurs indicatives, variables selon la morphologie.
- Références anatomiques : démonstration du Dr Brasseur (synthèse fournie par l'auteur, conservée dans le dépôt privé des sources) ; Balius R, Pedret C, Iriarte I, Sáiz R, Cerezal L. *Sonographic landmarks in hamstring muscles*. Skeletal Radiol. 2019;48(11):1675-1683, doi:10.1007/s00256-019-03208-x (S1, S3, S4 et S5 corrigés d'après cet article).

## S1 — Insertion ischiatique (version `e75bea72`)

Niveau : tubérosité ischiatique · tiers proximal

Relecture de l'auteur (12/10/2026) : **corrigé à sa demande d'après Balius et al. 2019 : tendon du semi-membraneux plus latéral et plus profond que le tendon conjoint, au contact du nerf sciatique ; fibres charnues du semi-tendineux insérées directement sur la tubérosité ; repère L contrôlé**.

**Ce qui est représenté**

- Coupe transversale au niveau de la tubérosité ischiatique, juste sous le pli fessier, sous le grand glutéal.
- Tubérosité ischiatique : ligne très hyperéchogène avec ombre acoustique postérieure.
- Semi-tendineux : seul ischio-jambier dont des fibres charnues atteignent directement la tubérosité ; elles sont dessinées au contact de la corticale.
- Tendon conjoint (longue portion du biceps + semi-tendineux) en dehors de la tubérosité, plus superficiel et plus hyperéchogène.
- Tendon du semi-membraneux plus latéral et plus profond que le tendon conjoint, au contact du nerf sciatique.
- Nerf sciatique, le plus latéral, couché sur le carré fémoral.
- « Triangle » de Michel Cohen : zone conjonctive étoilée au carrefour du tendon conjoint, du tendon du semi-membraneux, du semi-tendineux et du nerf sciatique.

**Étiquettes** (numéros de la version téléphone)

1. Grand glutéal
2. Tendon conjoint (longue portion du biceps + semi-tendineux) : en dehors de la tubérosité, superficiel
3. Semi-tendineux : fibres charnues insérées directement sur la tubérosité
4. « Triangle » de Michel Cohen : carrefour hyperéchogène étoilé
5. Nerf sciatique
6. Tubérosité ischiatique (corticale)
7. Tendon du semi-membraneux : plus latéral et plus profond, au contact du nerf
8. Carré fémoral (plan profond)

**Incertitudes à vérifier**

- [ ] Forme et position exactes du « triangle » de Michel Cohen : la synthèse de la démonstration le décrit comme une structure hyperéchogène étoilée réunissant tendon conjoint, tendon du semi-membraneux, semi-tendineux et nerf sciatique, sans en donner la géométrie ; ici, étoile à 4 branches vers ces quatre structures.
- [ ] Hauteur de coupe : à ce niveau, la longue portion du biceps n'est pas encore charnue (elle apparaît un peu plus bas, en triangle) ; seul le semi-tendineux l'est.
- [ ] Épaisseurs du grand glutéal et de la graisse : variables selon la morphologie.
- [ ] Carré fémoral : plan profond ajouté pour situer le nerf ; non cité dans les sources.
- [ ] En pratique, incliner la sonde (anisotropie) aide à distinguer le tendon du semi-membraneux du tendon conjoint ; non représenté.

## S2 — Croisement du semi-membraneux (version `409bef93`)

Niveau : quelques centimètres sous l'ischion · tiers proximal

Relecture de l'auteur (12/10/2026) : **validé**.

**Ce qui est représenté**

- Coupe transversale quelques centimètres sous l'ischion, au bord inférieur du grand glutéal.
- Tendon conjoint aplati entre le semi-tendineux (médial, déjà charnu) et le début de la longue portion du biceps (latéral).
- Tendon du semi-membraneux situé SOUS (en profondeur de) le tendon conjoint ; sa position latérale à l'insertion est rappelée en pointillé, et la flèche indique son trajet vers le versant médial quand on descend.
- Nerf sciatique en dehors, grand adducteur en profondeur, fémur en profondeur et en dehors.

**Étiquettes** (numéros de la version téléphone)

1. Grand glutéal (bord inférieur)
2. Semi-tendineux
3. Tendon conjoint
4. Longue portion du biceps (début)
5. Tendon du semi-membraneux : passe SOUS le tendon conjoint
6. Nerf sciatique
7. En descendant, il gagne le versant médial
8. Sa position à l'insertion (en dehors)
9. Fémur
10. Grand adducteur

**Incertitudes à vérifier**

- [ ] Niveau exact du croisement (en centimètres sous l'ischion) : non précisé dans la synthèse ; schéma placé à mi-chemin du croisement.
- [ ] Le croisement est un mouvement observé en balayant vers le bas : une seule coupe le résume avec une position fantôme et une flèche (convention du schéma, pas une structure).
- [ ] Hauteur d'apparition du corps charnu de la longue portion du biceps : approximative.
- [ ] Fémur (région du petit trochanter / haut de la diaphyse) placé pour l'orientation ; profondeur variable.

## S3 — Étoile « Mercedes » et membrane du semi-membraneux (version `200b0e1a`)

Niveau : jonction des tiers proximal et moyen · tiers proximal

Relecture de l'auteur (12/10/2026) : **corrigé à sa demande d'après Balius et al. 2019 : étoile « Mercedes » autour du nerf sciatique ; membrane du semi-membraneux du bord médial du nerf jusqu'à son tendon, ovale et plus petit que le nerf**.

**Ce qui est représenté**

- Coupe transversale à la jonction des tiers proximal et moyen de la cuisse.
- Étoile « Mercedes » : le nerf sciatique, ovale et fasciculé, au centre d'une étoile hyperéchogène à 3 branches ; branche superficielle = tendon conjoint, entre le semi-tendineux (en dedans) et la longue portion du biceps (en dehors) ; branches médiale et latérale le long de la face profonde du semi-tendineux et du biceps.
- Semi-tendineux un peu plus volumineux que le biceps à ce niveau.
- Membrane du semi-membraneux : ligne hyperéchogène qui part du bord médial du nerf et se termine sur le tendon du semi-membraneux, ovale et plus petit que le nerf, situé sous le semi-tendineux ; le corps charnu du semi-membraneux n'est pas encore visible.
- Grand adducteur en profondeur ; vaste latéral, cloison intermusculaire latérale et fémur en dehors.

**Étiquettes** (numéros de la version téléphone)

1. Semi-tendineux
2. Longue portion du biceps
3. Branche superficielle : tendon conjoint
4. Branche latérale (biceps)
5. Branche médiale (semi-tendineux)
6. Étoile « Mercedes » : nerf sciatique au centre de 3 branches hyperéchogènes
7. Membrane du semi-membraneux : du bord médial du nerf jusqu'au tendon
8. Tendon du semi-membraneux : ovale, plus petit que le nerf
9. Cloison intermusculaire latérale
10. Vaste latéral
11. Grand adducteur
12. Fémur (ligne âpre)

**Incertitudes à vérifier**

- [ ] Trajet des branches médiale et latérale de l'étoile : Balius ne le précise pas ; elles sont dessinées le long de la face profonde du semi-tendineux et du biceps.
- [ ] La synthèse de la démonstration décrit une membrane « en ménisque » tendue du tendon proximal vers le corps musculaire ; elle est dessinée ici d'après Balius, comme une ligne allant du bord médial du nerf au tendon, parallèle à la branche médiale. Longueur et épaisseur approximatives.
- [ ] Taille du tendon du semi-membraneux (plus petit que le nerf) : approximative.
- [ ] Courte portion du biceps non représentée : elle naît plus bas, au tiers moyen de la ligne âpre.

## S4 — Tiers moyen : les 4 repères conjonctifs (version `e3f36391`)

Niveau : tiers moyen de la cuisse · tiers moyen

**Piège : la cloison du semi-tendineux a une concavité médiale ; le début du semi-membraneux forme un demi-cercle à concavité latérale. Ne pas les confondre.**

Relecture de l'auteur (12/10/2026) : **corrigé à sa demande d'après Balius et al. 2019 : raphé du semi-tendineux à concavité médiale, début du semi-membraneux en demi-cercle à concavité latérale, note « piège »**.

**Ce qui est représenté**

- Coupe transversale au tiers moyen de la cuisse.
- Cloison sigmoïde (raphé) du semi-tendineux : voile blanc traversant tout le muscle, de son bord superficiel à son bord profond, à concavité médiale.
- Début du semi-membraneux : demi-cercle charnu à concavité latérale, son tendon logé dans la concavité ; il grossit vers le bas pendant que le semi-tendineux diminue.
- Piège : ne pas confondre la courbe du raphé du semi-tendineux (concavité médiale) avec le demi-cercle du semi-membraneux (concavité latérale).
- Cloison frontale du semi-membraneux : ligne blanche traversant le muscle dans le plan frontal (horizontale sur l'écran).
- Cloison frontale de la longue portion du biceps, dans le prolongement du tendon conjoint.
- Structure en T : la longue portion, large et superficielle, forme la barre ; la courte portion, étroite, descend vers la ligne âpre et forme le jambage ; une aponévrose commune les réunit. Nerf sciatique dans l'angle médial du T, entre longue portion, courte portion, semi-membraneux et grand adducteur.
- Grand adducteur en profondeur, fémur (ligne âpre) et vaste latéral en profondeur et en dehors.

**Étiquettes** (numéros de la version téléphone)

1. Semi-tendineux
2. Longue portion du biceps
3. Cloison frontale de la longue portion
4. Cloison sigmoïde (raphé) du semi-tendineux : concavité médiale
5. Structure en T : la longue portion (barre) posée sur la courte portion (jambage) par une aponévrose commune
6. Nerf sciatique, à la pointe du T
7. Cloison frontale du semi-membraneux
8. Tendon du semi-membraneux
9. Courte portion du biceps (jambage du T)
10. Début du semi-membraneux : demi-cercle à concavité latérale
11. Vaste latéral
12. Fémur (ligne âpre)
13. Grand adducteur

**Incertitudes à vérifier**

- [ ] Structure en T : la synthèse dit que la longue portion s'insère sur le fascia de la courte portion et que le nerf est « à la pointe du T », sans décrire le T. Lecture retenue : barre = longue portion, jambage = courte portion (vers la ligne âpre), aponévrose commune entre les deux, nerf dans l'angle médial du T. À confirmer sur vos images.
- [ ] Raphé du semi-tendineux : dessiné du bord superficiel au bord profond, concavité médiale (Balius) ; sa forme exacte varie avec la hauteur de coupe (« mouvement d'ascension » au balayage).
- [ ] Volume du semi-membraneux : la synthèse de la démonstration décrit trois muscles de volume voisin au tiers moyen ; Balius décrit à ce niveau le début du semi-membraneux en demi-cercle, qui grossit vers le bas. Dessiné en croissant de taille moyenne : à confirmer sur vos images.
- [ ] Position en hauteur des cloisons frontales dans chaque muscle : approximative.
- [ ] Largeur du champ : la coupe montre toute la loge postérieure ; avec une sonde linéaire, il faut en pratique deux positions ou un mode panoramique.

## S5 — « Cerise sur le gâteau » et patte d'oie (version `019a048e`)

Niveau : tiers distal de la cuisse · tiers distal

Relecture de l'auteur (12/10/2026) : **corrigé à sa demande d'après Balius et al. 2019 : le tendon du semi-tendineux repose SUR la face superficielle du semi-membraneux, dans une gouttière (et non en son centre) ; gracile et sartorius ajoutés en dedans**.

**Ce qui est représenté**

- Coupe transversale au tiers distal de la cuisse.
- « Cerise sur le gâteau » : le semi-tendineux, réduit à un petit ovale centré sur son tendon (la cerise), repose SUR la face superficielle du semi-membraneux (le gâteau), dans une gouttière, un peu en dehors de son centre.
- En dedans, muscles de la patte d'oie : gracile (petite section ronde) puis sartorius (plus épais, plus antérieur) ; tout l'espace entre le gracile et le semi-tendineux appartient au semi-membraneux.
- Longue portion du biceps (en surface) et courte portion (en profondeur) en dehors.
- Entre les deux groupes : graisse du sommet de la fosse poplitée, nerf sciatique, puis veine poplitée et artère poplitée, l'artère au plus profond, contre le fémur.

**Étiquettes** (numéros de la version téléphone)

1. Tendon du semi-tendineux : la « cerise », posée SUR le gâteau, dans une gouttière
2. Longue portion du biceps
3. Gracile
4. Semi-membraneux : le « gâteau »
5. Nerf sciatique (se divise vers le haut de la fosse poplitée)
6. Sartorius
7. Courte portion du biceps
8. Veine poplitée
9. Artère poplitée
10. Fémur (face poplitée)

**Incertitudes à vérifier**

- [ ] Profondeur de la gouttière et position de la cerise (un peu en dehors du centre du semi-membraneux, comme le décrit Balius) : approximatives.
- [ ] Hauteur de la division du nerf sciatique (variable ; environ 6 cm au-dessus du pli poplité selon Balius) : nerf dessiné encore unique.
- [ ] Vaisseaux : la veine est dessinée en surface et un peu en dedans de l'artère, l'artère au contact du fémur ; à ce niveau, ils viennent de franchir l'anneau du grand adducteur (hauteur variable).
- [ ] Vaste médial (en profondeur, en dedans) non représenté.

## S6 — Tendon distal du biceps fémoral (version `2fe5515f`)

Niveau : au-dessus du genou, côté latéral · tiers distal · Insertion distale double : tête de la fibula et plateau tibial (hors de cette coupe).

Relecture de l'auteur (12/10/2026) : **validé**.

**Ce qui est représenté**

- Coupe transversale au-dessus du genou, centrée sur le côté latéral de la fosse poplitée.
- Tendon distal du biceps fémoral : bande blanche épaisse formée sur la face superficielle de la courte portion, encore charnue en profondeur.
- Nerf fibulaire commun au bord médial et profond du tendon ; nerf tibial, veine et artère poplitées plus en dedans, dans la graisse de la fosse.
- Bord latéral du semi-membraneux à l'extrémité médiale du champ ; fémur (région supracondylienne) en profondeur.

**Étiquettes** (numéros de la version téléphone)

1. Tendon distal du biceps fémoral : épaississement de la face superficielle de la courte portion
2. Semi-membraneux
3. Nerf fibulaire commun, au bord médial du tendon
4. Nerf tibial
5. Courte portion du biceps
6. Veine poplitée
7. Artère poplitée
8. Fémur (région supracondylienne)

**Incertitudes à vérifier**

- [ ] Hauteur de coupe : choisie au-dessus de l'interligne, là où le tendon se forme ; l'insertion double (tête de la fibula et plateau tibial) n'est pas visible en coupe transversale à ce niveau.
- [ ] Distance entre le nerf fibulaire commun et le tendon : variable ; ici, au contact de son bord médial.
- [ ] Part respective de la longue et de la courte portion dans le tendon : non détaillée (la synthèse le décrit comme un épaississement du versant superficiel de la courte portion).
- [ ] Chef latéral du gastrocnémien et bandelette ilio-tibiale non représentés.

## Modèles 3D (18 fichiers, 0.32 Mo, CC BY-SA 4.0)

| Fichier | Structure | Version | Modifications |
|---|---|---|---|
| `biceps-long.glb` | Longue portion du biceps fémoral | `b3927254df19` | simplifié de 7258 à 5806 triangles (20 %) |
| `biceps-court.glb` | Courte portion du biceps fémoral | `416c56c44982` | — |
| `semi-tendineux.glb` | Semi-tendineux | `5c9067684606` | — |
| `semi-membraneux.glb` | Semi-membraneux | `808fd880f747` | simplifié de 7442 à 5952 triangles (20 %) |
| `grand-gluteal.glb` | Grand glutéal | `a6eedaf7cb00` | simplifié de 3326 à 2500 triangles (25 %) |
| `grand-adducteur.glb` | Grand adducteur | `c4ba9c66455c` | simplifié de 8192 à 2500 triangles (69 %) |
| `vaste-lateral.glb` | Vaste latéral | `6647dc942321` | simplifié de 9356 à 2500 triangles (73 %) |
| `os-coxal.glb` | Os coxal | `43eebac11e95` | simplifié de 3788 à 3000 triangles (21 %) |
| `femur.glb` | Fémur | `7e32f21c0773` | simplifié de 3794 à 3000 triangles (21 %) |
| `tibia-proximal.glb` | Tibia (partie proximale) | `ddb39b228721` | coupé 12 cm sous le sommet du tibia, section refermée |
| `fibula-proximale.glb` | Fibula (partie proximale) | `1155aa9c7299` | coupé 12 cm sous le sommet du tibia, section refermée |
| `nerf-sciatique.glb` | Nerf sciatique | `2a6abf4099de` | diamètre d'affichage 11 mm au tiers moyen de la cuisse (mesuré : 10.3 mm ; pack : 1 à 12 mm ; section ronde ; approximatif) |
| `nerf-tibial.glb` | Nerf tibial | `e9675d5cf665` | diamètre d'affichage 5 mm dans la fosse poplitée (mesuré : 4.6 mm ; pack : 1 à 4 mm ; section ronde ; approximatif) ; coupé 12 cm sous le sommet du tibia, section refermée |
| `nerf-fibulaire-commun.glb` | Nerf fibulaire commun | `ecd51734b084` | diamètre d'affichage 3.5 mm dans la fosse poplitée (mesuré : 3.2 mm ; pack : 1 à 1 mm ; section ronde ; approximatif) |
| `artere-femorale.glb` | Artère fémorale | `2604f693ba93` | épaisseur du pack (9 à 9 mm de diamètre) |
| `veine-femorale.glb` | Veine fémorale | `5d7366bba606` | épaisseur du pack (10 à 10 mm de diamètre) |
| `artere-poplitee.glb` | Artère poplitée | `acd5eac65056` | épaisseur du pack (6 à 9 mm de diamètre) |
| `veine-poplitee.glb` | Veine poplitée | `0201fea13678` | épaisseur du pack (6 à 10 mm de diamètre) |

**Incertitudes à vérifier**

- [ ] Diamètres d'affichage des nerfs, calés sur des valeurs réalistes APPROXIMATIVES : sciatique 11 mm au tiers moyen de la cuisse, tibial 5 mm et fibulaire commun 3,5 mm dans la fosse poplitée (valeurs mesurées après export dans le tableau ci-dessus). Section ronde, alors que le nerf sciatique est plutôt aplati.
- [ ] Vaisseaux : épaisseurs du pack Z-Anatomy, non modifiées.
- [ ] Parties tendineuses des muscles : délimitées par le pack (BodyParts3D). Le modèle ne distingue ni le tendon conjoint du tendon du semi-membraneux, ni les cloisons internes : ces repères sont portés par les schémas 2D.
- [ ] Un seul modèle anatomique (BodyParts3D, homme adulte) : proportions, longueur des tendons et trajet du nerf sciatique à comparer à vos images.
- [ ] Tibia et fibula coupés 12 cm sous le sommet du tibia (tête fibulaire incluse) ; os coxal droit seul pour le bassin.
- [ ] Simplification : 20 % des triangles retirés pour la longue portion du biceps et le semi-membraneux ; formes à vérifier de près dans la visionneuse.
