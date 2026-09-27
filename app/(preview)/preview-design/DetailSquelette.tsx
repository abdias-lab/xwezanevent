type Styles = Record<string, string>;

/** Squelette statique (pas de shimmer en boucle) de la page de détail. */
export default function DetailSquelette({ s }: { s: Styles }) {
  return (
    <div className={s.skelDetail} aria-busy="true" aria-label="Chargement de l'événement">
      <div className={s.skelImg} />
      <div className={s.skelL1} style={{ width: "80%", height: 32 }} />
      <div className={s.skelL2} />
      <div className={s.skelL3} />
      <div className={s.skelL2} style={{ marginTop: 24 }} />
      <div className={s.skelL1} style={{ height: 96 }} />
    </div>
  );
}
