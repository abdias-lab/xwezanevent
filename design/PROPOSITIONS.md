# Propositions de refonte visuelle — accueil + détail d'événement

Trois versions sont consultables sur `/preview-design` (accueil : `/v1`, `/v2`, `/v3` ; détail : `/vN/evenement`).
Données factices, layout autonome, `noindex`, aucun lien avec Supabase ni FedaPay. Rien n'est branché sur le site public.

Source d'inspiration commune : `design/DESIGN.md` (direction « billetterie nocturne », à utiliser comme direction et non comme copie).

## Ce qui est identique dans les trois versions (pour comparer à structure égale)

- Groupement des événements par jour, intertitre en capitales « SAM 3 OCT. » avec compteur ; les jours sans événement n'apparaissent pas.
- Filtres par catégorie (puces avec compteur), états chargement (squelettes) et vide (`?etat=chargement`, `?etat=vide`).
- Cas limites de données : affiche portrait, bandeau 3:1, image 16×16 étirée, événement sans affiche (repli avec initiales), festival multi-jours, événement gratuit.
- Icônes : uniquement le composant `Icon` (SVG). Aucun emoji.
- Détail : sélecteur de billets, barre de paiement collée en bas sur mobile, colonne billets sticky sur desktop.
- Dimensionné d'abord pour 375 px.

## Comparaison

| | V1 « Doré sobre » | V2 « Nuit anthracite » | V3 « Indigo éditorial » |
|---|---|---|---|
| Fond | `#151009` | `#1c1c1c` | `#0d1030` |
| Accents | doré `#E4A93F`, terre `#C24E2A`, ivoire `#F3EADA` | doré sur blanc et gris | doré, terre, ivoire sur indigo |
| Titres | Unbounded en capitales, très larges | Unbounded en capitales, énormes (pile de titres) | Playfair italique |
| Structure d'accueil | hero + recherche, « À la une », programmation | hero en carte, pile « En ce moment », programmation | hero à motif losange, carrousel « Sélection du moment », programmation |
| Billets / cartes | plats, coins 4 px | plats, coins 4 px, boutons blancs | cartes en ticket perforé, coins 8 px, pastille de date |
| Proximité avec `DESIGN.md` | moyenne | forte | faible |
| Proximité avec le système « Doré » | forte | faible (palette grise) | moyenne (doré conservé, fond différent) |

## Partis pris et limites

**V1.** Reprend fidèlement la palette figée. C'est la plus calme : l'affiche fait le spectacle, l'interface s'efface. Point faible : la mise en page ressemble à un site de billetterie générique, elle se distingue peu des concurrents.

**V2.** La plus proche de `DESIGN.md` : fond gris, boutons blancs, titres massifs. La pile de titres « En ce moment » a le plus d'impact visuel. Points faibles : elle abandonne le fond brun `#151009` et l'ivoire du système figé, et les titres géants occupent 2 à 3 lignes par événement sur mobile (à tester avec de vrais noms longs).

**V3.** La plus identitaire : la voix Playfair italique rejoint le logo « Xwézan », le billet perforé raconte le produit, le carrousel donne de la place à trois événements. Points faibles : fond indigo absent de la charte, cartes plus hautes donc moins d'événements visibles par écran sur mobile, et c'est la plus lourde à intégrer (voir ci-dessous).

## Coûts d'intégration

Points communs à tous : les previews utilisent **Unbounded** pour les titres, qui n'est pas dans le système typographique (Bricolage Grotesque / Instrument Sans / Space Grotesk). Il faut soit l'ajouter (une famille de plus à charger), soit remplacer par Bricolage Grotesque en réglant graisse et espacement, ce qui change l'effet « extra-large » recherché.

| | Ampleur | Détail |
|---|---|---|
| V1 | faible | Mêmes couleurs que le site actuel. Travail : remplacer l'en-tête et les cartes, recaler les titres, choisir la police. Pas de nouvelle famille si on garde Bricolage. |
| V2 | moyenne | Il faut soit changer la palette figée (décision de marque), soit recolorer la version dans les tons bruns du système, ce qui la fait converger vers V1. Le principe de titres géants demande des tests sur les longs noms d'événements. |
| V3 | élevée | Nouveau fond, nouveaux composants (ticket perforé, carrousel à défilement horizontal, à rendre accessible au clavier), motif losange, et Playfair à charger pour les titres (le logo l'utilise déjà, à vérifier côté poids de page). |

Dans tous les cas : les données réelles (affiches uploadées, noms longs, événements sans image) passent par les mêmes composants `Affiche` / `Carte` / `Programme`, déjà écrits pour ces cas limites, ce qui limite le risque de régression.

## Recommandation

**V1 comme base, en empruntant à V3 le carrousel « Sélection du moment » pour la mise en avant si tu veux plusieurs événements à la une.**

Raisons :
1. Elle respecte la palette « Doré », que CLAUDE.md déclare figée : c'est la seule qui n'oblige pas à rouvrir une décision de marque.
2. Coût d'intégration le plus bas, ce qui compte avant le lancement (comptes de test, clés FedaPay live, audit externe restent à faire).
3. Elle est la plus lisible à 375 px, format prioritaire.

Ce que V1 n'a pas et qu'il faudrait trancher : un peu de personnalité. Si la sobriété te semble trop générique, la piste la moins coûteuse est d'y ajouter la voix Playfair italique de V3 sur quelques titres seulement (intertitres de section), sans changer de fond.

À éviter : V2 telle quelle (elle contredit la palette figée), et V3 en l'état (coût et poids disproportionnés pour un gain d'identité qui peut s'obtenir plus légèrement).

## Décisions à prendre

1. Police des titres : garder Unbounded (nouvelle famille) ou passer à Bricolage Grotesque.
2. Base retenue : V1, ou V1 + emprunt(s) à V3.
3. Mise en avant : un seul événement « À la une » (V1) ou plusieurs (carrousel V3).

## Notes de contrôle (état au moment de la rédaction)

- `tsc --noEmit` et `next build` passent, les 7 routes de preview sont générées.
- Vérifié visuellement à 375 px et 1280 px (accueil, détail, `?etat=chargement`, `?etat=vide`). Captures faites avec Edge headless, dans une iframe de 375 px : l'extension Chrome n'était pas connectée. Aucun test sur vrai téléphone, et aucun test d'interaction (clic sur filtres, sélecteur de billets).
- Corrigé en cours de route : texte des boutons invisible en V2 (règle de reset CSS trop spécifique, corrigée dans les trois versions), espacements écrasés par le même reset, vignette « SA » rognée dans la pile V2, dates de la pile V2 coupées sur deux lignes.
- Constat non corrigé : avec le groupement par jour, un jour à un seul événement laisse une carte seule sur une ligne en desktop (deux tiers de vide). Acceptable en preview, à traiter à l'intégration (grille plus dense ou groupement par semaine).
- Constat non corrigé : en `?etat=vide`, la puce « Sport » active est hors écran dans le défilement horizontal des filtres sur mobile.
- En V1, la puce « Festival » affiche 0 parce que le festival à la une est retiré de la liste ; à revoir si on garde ce comportement.
