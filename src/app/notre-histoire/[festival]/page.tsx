import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { anneesDuFestival, festivalParId } from "@/data/festivals";
import { createClient } from "@/lib/supabase/server";
import { rapprocherSelections, type LiensSelection } from "../rapprochement";
import VueFestival from "./VueFestival";

export async function generateMetadata({ params }: { params: Promise<{ festival: string }> }): Promise<Metadata> {
  const { festival } = await params;
  const f = festivalParId(festival);
  return { title: `${f?.nom ?? "Festival"} — Notre histoire — WeFilmGood` };
}

export default async function FestivalPage({
  params,
  searchParams,
}: {
  params: Promise<{ festival: string }>;
  searchParams: Promise<{ annee?: string }>;
}) {
  const { festival } = await params;
  const f = festivalParId(festival);
  if (!f) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La frise de « Notre histoire » arrive sur une année précise
  // (?annee=2014#programme-…).
  const { annee } = await searchParams;
  const annees = anneesDuFestival(f);
  const anneeDemandee = Number(annee);
  const anneeInitiale = annees.includes(anneeDemandee) ? anneeDemandee : annees[0];

  // Les titres et les auteurs reliés aux fiches et aux profils, pour les
  // membres connectés seulement (rien n'est visible sans compte).
  const liens: LiensSelection = user ? await rapprocherSelections(supabase, f.selections) : {};

  return (
    <PageShell eyebrow="Notre histoire" title={f.nom} enTeteAnime connecte={!!user}>
      <VueFestival
        nom={f.nom}
        logo={f.logo ?? null}
        logoRond={f.logoRond ?? false}
        annees={annees}
        anneeInitiale={anneeInitiale}
        selections={f.selections}
        liens={liens}
      />
    </PageShell>
  );
}
