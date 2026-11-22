"use client";

import { useState } from "react";
import CoeurNote from "@/components/CoeurNote";

/**
 * La note publiée, avec le cœur du coup de cœur qui paraît dès que la note
 * tapée dépasse 180 (22/11, Sarah) : elle le voit avant de publier.
 */
export default function ChampNote({ depart }: { depart: number }) {
  const [note, setNote] = useState<number | null>(depart);
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number"
        name="score"
        min={0}
        max={200}
        defaultValue={depart}
        required
        style={{ flex: 1 }}
        onChange={(e) => setNote(e.target.value === "" ? null : Number(e.target.value))}
      />
      <CoeurNote note={note} taille="34px" />
    </span>
  );
}
