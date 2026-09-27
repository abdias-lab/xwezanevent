# DESIGN.md — Style « billetterie nocturne » (inspiré de shotgun.live)

> Version fusionnée du 26/09/2026 : relevé manuel (home + page ville Paris) + extraction dembrandt v0.36.0 (page ville Paris).
> À utiliser comme **direction visuelle**, pas comme copie : ne reprends ni le nom, ni le logo, ni les visuels de Shotgun.
> Stack d'origine détectée : Next.js + **Tailwind CSS + shadcn/ui** (+ Headless UI). Les tokens ci-dessous se transposent donc directement dans un projet Tailwind/shadcn.

## 1. Intention (north star)

Une salle de club au moment où les lumières s'éteignent : fond anthracite quasi noir, titres massifs en capitales ultra-larges, texte gris discret, et **la couleur vient uniquement des visuels d'événements et d'un dégradé violet → rose → pêche** utilisé en halo. L'interface s'efface, l'affiche de l'événement fait le spectacle.

Règles d'or :
- Dark mode par défaut (et unique). Jamais de fond blanc en pleine page.
- Titres = capitales, police extended black. Texte courant = grotesque medium.
- Peu d'aplats de couleur : blanc translucide (5–10 %) pour les surfaces, un seul accent chaud pour les dates.
- Coins quasi carrés (4 px). Seuls les tags et puces sont en pilule.

## 2. Couleurs

```css
:root {
  /* Fonds */
  --bg:            #1c1c1c;              /* fond de page */
  --bg-raised:     #1d1d1d;              /* carte hero, légère élévation */
  --surface:       rgb(255 255 255 / .05); /* blocs secondaires */
  --surface-hover: rgb(255 255 255 / .10); /* boutons secondaires, filtres */
  --border:        rgb(255 255 255 / .10); /* bordures fines, séparateurs, tags */

  /* Texte */
  --text:          #ffffff;              /* titres, labels, prix */
  --text-muted:    #a3a5a8;              /* paragraphes, sous-titres, lieux, tags */
  --text-inverse:  #1c1c1c;              /* texte sur bouton blanc */

  /* Accents */
  --accent-date:   #ff765f;              /* date & heure des événements (corail) */
  --rating:        #ffdb99;              /* étoiles de notation */
  --success:       #5bc870;
  --danger:        #d11c00;

  /* Dégradé signature (halos décoratifs, jamais derrière du texte long) */
  --grad-1: #8c7fff;  /* violet */
  --grad-2: #f26af2;  /* rose */
  --grad-3: #ffc478;  /* pêche */
  --gradient: linear-gradient(135deg, var(--grad-1), var(--grad-2) 50%, var(--grad-3));

  /* Ombres (valeurs relevées) */
  --shadow-sm:   0 2px 4px -1px rgb(15 15 15 / .44);   /* petits éléments, menus */
  --shadow-lg:   0 20px 40px -4px rgb(15 15 15 / .90); /* hero, popovers, modales */
  --shadow-glow: 0 0 12px rgb(0 0 0 / .34);            /* halo discret autour des blocs */
}
```

Usage du dégradé : en tâche floue (blur 80–120 px, opacité 40–60 %) dans un coin de la page (en haut à gauche sur les pages liste), ou en fond d'un bloc promo. Jamais en couleur de texte courant ni de bouton standard.

## 3. Typographie

| Rôle | Police | Taille / interligne | Graisse | Casse |
|---|---|---|---|---|
| Display (hero artiste, carrousel) | Extended Black | 72 / 72 px | 900 | MAJ |
| H1 page | Extended Black | 36–48 px (desktop), 24/32 mobile | 900 | MAJ |
| H2 section | Extended Black | 24–30 / 32–36 px | 900 | MAJ |
| H3 bloc | Extended Black | 24 / 32 px | 900 | MAJ |
| Titre carte événement | Grotesk | 18 px | 700 | normale |
| Corps | Grotesk | 16 / 24 px | 500 | normale |
| Secondaire (lieu, organisateur) | Grotesk | 14 px | 500 | normale |
| Nav / boutons / labels | Grotesk | 12–14 px | 500–700 | MAJ |
| Tags genre musical | Grotesk | 10 px | 500 | MAJ |

- **Display** : Shotgun utilise *Monument Extended Black* (police commerciale Pangram Pangram, licence payante). Alternative gratuite proche : **Unbounded 900** (Google Fonts).
- **Texte** : **Space Grotesk** 300–700 (Google Fonts, gratuite).
- Le corps de texte est en **500 par défaut** (pas 400) : c'est ce qui donne l'aspect dense et affirmé.
- Pas de letter-spacing ajouté ; c'est la largeur de la police display qui fait l'effet.

```css
--font-display: "Unbounded", "Monument Extended", system-ui, sans-serif;
--font-body: "Space Grotesk", system-ui, sans-serif;
body { font: 500 16px/24px var(--font-body); color: var(--text); background: var(--bg); }
```

## 4. Espacements, rayons, grille

```css
--radius-sm: 4px;      /* boutons, images de cartes, champs — le rayon par défaut */
--radius-md: 7px;      /* petits blocs, menus déroulants */
--radius-lg: 16px;     /* grands blocs (hero, carte promo) — relevé 14–16px */
--radius-xl: 32px;     /* grandes surfaces arrondies, rare */
--radius-pill: 9999px; /* tags, puces, barre de recherche, sélecteur de ville */

--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;
```

> dembrandt relève aussi des micro-valeurs (2px, 3.5px, 7px, 8.75px, 14px) : ce sont des ajustements internes de composants (paddings de tags, icônes). Garde l'échelle de 4 ci-dessus pour tout le reste.

- Breakpoints : **600px** (grand mobile), **768px** (tablette), **1280px** (desktop). Tailwind : `sm: 600px`, `md: 768px`, `xl: 1280px`.
- Conteneur : ~**1232 px** de contenu (max-width 1280 px + 24 px de padding latéral), centré.
- Grille d'événements : **3 colonnes** desktop, gap horizontal **32 px**, pas de gap vertical imposé (l'espace vient du contenu des cartes). 2 colonnes tablette, 1 colonne mobile.
- Sections séparées par 64–96 px, ou par un filet `1px solid var(--border)`.

## 5. Composants

### Header
- Hauteur ~64 px, fond `--bg`, logo à gauche.
- Barre de recherche centrale : fond `--surface-hover`, coins pilule, icône loupe, placeholder `--text-muted` 14 px.
- Liens nav : 12 px, MAJ, 500–600, blanc.
- CTA « Se connecter » : **bouton blanc plein**, texte `--text-inverse`, 12 px MAJ 700, hauteur 36 px, padding 0 12 px, rayon 4 px.

### Boutons
| Variante | Fond | Texte | Hauteur | Padding | Rayon |
|---|---|---|---|---|---|
| Primaire | `#fff` | `#1c1c1c` | 36–40 px | 0 12–16 px | 4 px |
| Secondaire | `--surface-hover` | `#fff` | 40 px | 8 px 16 px | 4 px |
| Ghost / lien | transparent | `#fff` | — | — | — |

Libellés 12–14 px, 700, souvent en MAJ. Icône flèche ↗ pour les liens sortants (« Publie ton évènement ↗ »).

### Filtres (page liste)
Boutons secondaires (fond `--surface-hover`), MAJ 12 px 700, avec chevron ⌃⌄ pour les sélecteurs. Alignés en ligne avec 12–16 px d'écart.

### Carte événement
Pas de fond, pas de bordure : c'est l'image qui délimite la carte.
1. **Image** 16:9, rayon 4 px, pleine largeur de colonne.
2. **Titre** 18 px 700 blanc (1–2 lignes, ellipse).
3. **Lieu / organisateur** 14 px 500 `--text-muted`.
4. **Date · heure** 16 px 500 en **`--accent-date`** (corail), séparateur `|` en gris.
5. **Prix** 16 px 500 blanc (« 19,99 € », « Gratuit »).
6. **Tags** genres : pilules 10 px MAJ, texte `--text-muted`, bordure `1px solid var(--border)`, padding 2 px 10 px, fond transparent ; au-delà de 3, un tag « +N ».

Espacement interne vertical : 8–12 px entre les lignes. Hover : léger zoom de l'image (scale 1.03) ou opacité du titre.

### Hero d'accueil
Grand bloc `--bg-raised`, rayon 16 px, ombre `--shadow-lg`, padding ~64 px. Titre display MAJ sur 2 lignes, sous-titre `--text-muted`, puis boutons secondaires (stores) + note ★ en `--rating`. Mockups d'app à droite.

### Carrousel artistes
Titres display 72 px MAJ empilés, cliquables, avec le nom de l'événement en 16 px dessous ; padding vertical 32 px par ligne.

### Breadcrumb
14 px, liens blancs, page courante en `--text-muted`, séparateur chevron ›.

## 6. Mouvement
- Durées : **150 ms** (boutons, liens) et **200 ms** (liens, états plus visibles) ; 300 ms pour le zoom d'image au survol.
- Easing unique : `cubic-bezier(0.4, 0, 0.2, 1)` (= `ease-in-out` par défaut de Tailwind).
- Propriétés animées : `color`, `background-color`, `border-color` uniquement (+ `transform` pour les images).
- Pas d'animations décoratives en boucle hormis le halo dégradé (éventuellement lent, 10 s+).

```css
--duration-fast: 150ms;
--duration-base: 200ms;
--ease: cubic-bezier(0.4, 0, 0.2, 1);
```

## 7. À faire / à éviter

✅ Laisser les visuels des événements porter la couleur.
✅ Titres toujours en MAJ extended black, courts.
✅ Beaucoup de gris `--text-muted` pour hiérarchiser.
❌ Pas de cartes avec fond coloré ou ombre marquée dans les listes.
❌ Pas de coins très arrondis (> 16 px) sauf pilules.
❌ Pas de dégradé sur les boutons ni derrière du texte long.
❌ Ne pas reprendre le nom, le logo sablier ni les illustrations de Shotgun.
