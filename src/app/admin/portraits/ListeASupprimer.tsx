"use client";

import { useRef, useState, type ReactNode } from "react";
import styles from "./portraits.module.css";

/** Le formulaire des personnages à supprimer : cases à cocher, « Tout cocher » et confirmation. */
export default function ListeASupprimer({
  action,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [n, setN] = useState(0);

  const compter = () => setN(form.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]:checked').length ?? 0);
  const toutCocher = (coche: boolean) => {
    form.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((c) => (c.checked = coche));
    compter();
  };

  return (
    <form
      ref={form}
      action={action}
      onChange={compter}
      onSubmit={(e) => {
        if (!window.confirm(`Supprimer ${n} personnage${n > 1 ? "s" : ""} ? Cette action ne s’annule pas depuis le site.`)) e.preventDefault();
      }}
    >
      <div className={styles.barreSuppression}>
        <button type="button" className={styles.ouvrir} onClick={() => toutCocher(true)}>
          Tout cocher
        </button>
        <button type="button" className={styles.ouvrir} onClick={() => toutCocher(false)}>
          Tout décocher
        </button>
        <button type="submit" className={styles.retirer} disabled={n === 0}>
          Supprimer les personnages cochés ({n})
        </button>
      </div>
      {children}
    </form>
  );
}
