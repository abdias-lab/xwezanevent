import s from "./index.module.css";

const VERSIONS = [
  {
    id: "v1",
    nom: "V1 · Doré structuré",
    texte: "Palette actuelle conservée. Cartes sans boîte, coins 4 px, titres en capitales, doré réservé aux dates et aux actions.",
    couleurs: ["#151009", "#1f1710", "#e4a93f", "#c24e2a", "#f3eada"],
  },
  {
    id: "v2",
    nom: "V2 · Doré + nuit",
    texte: "Fond anthracite neutre, surfaces translucides, CTA blanc. Le doré est l'unique accent chaud. Titres massifs empilés.",
    couleurs: ["#1c1c1c", "#242424", "#ffffff", "#e4a93f", "#a3a5a8"],
  },
  {
    id: "v3",
    nom: "V3 · Indigo nuit",
    texte: "Indigo profond, doré, terre cuite en signal. Titres Playfair italique, billets en forme de ticket perforé, motif losange.",
    couleurs: ["#0d1030", "#151a44", "#e4a93f", "#c24e2a", "#f3eada"],
  },
];

export default function PreviewIndex() {
  return (
    <div className={s.racine}>
      <div className={s.cont}>
        <h1 className={s.titre}>Preview design</h1>
        <p className={s.intro}>
          Trois directions pour la refonte visuelle de XwézanEvent, avec des données factices. Rien ici n&apos;est branché sur la base
          ni sur le site en production.
        </p>
        <p className={s.astuce}>À juger d&apos;abord à 375 px de large (mode responsive du navigateur), puis en desktop.</p>

        <ul className={s.liste}>
          {VERSIONS.map((v) => (
            <li key={v.id} className={s.version}>
              <h2>{v.nom}</h2>
              <p>{v.texte}</p>
              <div className={s.palette} aria-hidden="true">
                {v.couleurs.map((c) => (
                  <span key={c} className={s.pastille} style={{ background: c }} />
                ))}
              </div>
              <div className={s.liens}>
                <a className={`${s.lien} ${s.lienPrimaire}`} href={`/preview-design/${v.id}`}>
                  Accueil
                </a>
                <a className={s.lien} href={`/preview-design/${v.id}/evenement`}>
                  Détail
                </a>
              </div>
            </li>
          ))}
        </ul>

        <p className={s.etats}>
          <strong>États à relire.</strong> Ajouter <code>?etat=vide</code> ou <code>?etat=chargement</code> à l&apos;accueil, et{" "}
          <code>?affiche=non</code> ou <code>?etat=chargement</code> au détail. Le filtre « Sport » de chaque accueil montre aussi
          l&apos;état vide. Les affiches de démonstration mêlent portrait, bandeau 3:1, image 16×16 px étirée et absence d&apos;affiche.
        </p>
      </div>
    </div>
  );
}
