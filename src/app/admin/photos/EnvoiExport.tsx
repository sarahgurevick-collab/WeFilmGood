"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import type { EtatDepot, Source } from "@/lib/photos-archives";

const NOMS: Record<Source, string> = { mds: "Maison des Scénaristes", wefilmgood: "WeFilmGood" };

/**
 * Le dépôt du fichier .zip envoyé par Facebook (24/10/2026). Il part par
 * morceaux de 8 Mo : une coupure reprend au morceau suivant. Le serveur
 * range ensuite les photos tout seul ; la page suit l'avancée.
 */
export default function EnvoiExport({ depots: initiaux }: { depots: EtatDepot[] }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [progres, setProgres] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [depots, setDepots] = useState(initiaux);

  const enCours = depots.some((d) => d.etat === "recu" || d.etat === "import");
  useEffect(() => {
    if (!enCours) return;
    const t = setInterval(async () => {
      const r = await fetch("/api/admin/photos/depots").then((x) => x.json()).catch(() => null);
      if (r?.depots) {
        setDepots(r.depots);
        router.refresh();
      }
    }, 5000);
    return () => clearInterval(t);
  }, [enCours, router]);

  useEffect(() => {
    if (!envoi) return;
    const garde = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", garde);
    return () => window.removeEventListener("beforeunload", garde);
  }, [envoi]);

  async function envoyer() {
    const fichier = champ.current?.files?.[0];
    if (!fichier || !source) return;
    setErreur(null);
    setEnvoi(true);
    setProgres(0);
    try {
      const o = await fetch("/api/admin/photos/depots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, nom: fichier.name, taille: fichier.size }),
      });
      const infos = (await o.json().catch(() => ({}))) as { id?: string; morceau?: number; erreur?: string };
      if (!o.ok || !infos.id) throw new Error(infos.erreur ?? "L'envoi n'a pas pu commencer.");
      const taille = infos.morceau ?? 8 * 1024 * 1024;
      let decalage = 0;
      let essais = 0;
      while (decalage < fichier.size) {
        try {
          const r = await fetch(`/api/admin/photos/depots/${infos.id}/morceau`, {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream", "x-decalage": String(decalage) },
            body: fichier.slice(decalage, Math.min(decalage + taille, fichier.size)),
          });
          const c = (await r.json().catch(() => ({}))) as { recu?: number; erreur?: string };
          if (r.status === 409 && typeof c.recu === "number") {
            decalage = c.recu;
            continue;
          }
          if (!r.ok || typeof c.recu !== "number") throw new Error(c.erreur ?? "Envoi interrompu.");
          decalage = c.recu;
          essais = 0;
        } catch (e) {
          if (++essais > 8) throw e instanceof Error ? e : new Error("Envoi interrompu.");
          await new Promise((res) => setTimeout(res, 2000 * essais));
          continue;
        }
        setProgres(decalage / fichier.size);
      }
      const fin = await fetch(`/api/admin/photos/depots/${infos.id}/terminer`, { method: "POST" });
      if (!fin.ok) throw new Error("La fin de l'envoi a échoué.");
      const r = await fetch("/api/admin/photos/depots").then((x) => x.json()).catch(() => null);
      if (r?.depots) setDepots(r.depots);
      setNom(null);
      if (champ.current) champ.current.value = "";
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  const lisible = (d: EtatDepot) => {
    switch (d.etat) {
      case "envoi":
        return "envoi interrompu avant la fin";
      case "recu":
        return "reçu, rangement des photos en cours…";
      case "import":
        return d.total ? `rangement en cours : ${(d.importees ?? 0) + (d.ignorees ?? 0)} / ${d.total} photos` : "ouverture du fichier…";
      case "fini":
        return `terminé : ${d.importees ?? 0} photos rangées${d.ignorees ? `, ${d.ignorees} déjà là` : ""}${d.echecs ? `, ${d.echecs} illisibles` : ""}`;
      case "echec":
        return `échec (${d.erreur ?? "erreur inconnue"}) — prévenez Claude`;
    }
  };

  return (
    <section style={{ border: "1px solid #ddd", borderRadius: 14, padding: "16px 18px", marginBottom: 28 }}>
      <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>Déposer un export Facebook</h2>
      <p className={formStyles.hint} style={{ margin: "0 0 12px" }}>
        Le fichier .zip téléchargé depuis Facebook, tel quel. S&apos;il y en a plusieurs, déposez-les l&apos;un après l&apos;autre.
      </p>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 14, marginBottom: 10 }}>
        {(["mds", "wefilmgood"] as Source[]).map((s) => (
          <label key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="radio" name="source" checked={source === s} disabled={envoi} onChange={() => setSource(s)} />
            Page {NOMS[s]}
          </label>
        ))}
      </div>
      <input
        ref={champ}
        type="file"
        accept=".zip,application/zip"
        disabled={envoi}
        onChange={(e) => {
          setNom(e.target.files?.[0]?.name ?? null);
          setErreur(null);
        }}
      />
      {erreur && <p className={formStyles.error}>{erreur}</p>}
      {envoi ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 8, borderRadius: 4, background: "#e6e6e6", overflow: "hidden" }}>
            <div style={{ width: `${Math.round(progres * 100)}%`, height: "100%", background: "#DA2C25", transition: "width .3s" }} />
          </div>
          <p className={formStyles.hint} style={{ marginTop: 6 }}>
            Envoi de {nom} : {Math.round(progres * 100)} %. Ne fermez pas cette page.
          </p>
        </div>
      ) : (
        <button type="button" className={formStyles.submit} style={{ marginTop: 12, display: "block" }} onClick={envoyer} disabled={!nom || !source}>
          Envoyer
        </button>
      )}
      {depots.length > 0 && (
        <ul style={{ margin: "14px 0 0", paddingLeft: 18, fontSize: 14 }}>
          {depots.map((d) => (
            <li key={d.id}>
              {NOMS[d.source]} · {d.nom} — {lisible(d)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
