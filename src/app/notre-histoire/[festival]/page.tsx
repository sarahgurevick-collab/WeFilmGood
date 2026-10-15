import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { anneesDuFestival, festivalParId, photosDuFestival } from "@/data/festivals";
import { createClient } from "@/lib/supabase/server";
import VueFestival from "./VueFestival";

export async function generateMetadata({ params }: { params: Promise<{ festival: string }> }): Promise<Metadata> {
  const { festival } = await params;
  const f = festivalParId(festival);
  return { title: `${f?.nom ?? "Festival"} — Notre histoire — WeFilmGood` };
}

export default async function FestivalPage({ params }: { params: Promise<{ festival: string }> }) {
  const { festival } = await params;
  const f = festivalParId(festival);
  if (!f) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell eyebrow="Notre histoire" title={f.nom} enTeteAnime connecte={!!user}>
      <VueFestival
        nom={f.nom}
        logo={f.logo ?? null}
        annees={anneesDuFestival(f)}
        selections={f.selections}
        photos={photosDuFestival(f)}
      />
    </PageShell>
  );
}
