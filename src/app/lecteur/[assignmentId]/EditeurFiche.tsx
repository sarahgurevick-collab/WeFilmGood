"use client";

import RichTextEditor from "@/components/RichTextEditor";
import { saveDraft } from "./actions";

export default function EditeurFiche({
  assignmentId,
  brouillon,
}: {
  assignmentId: string;
  brouillon: string;
}) {
  return (
    <RichTextEditor
      fiche
      name="content"
      defaultValue={brouillon}
      onDraft={(html) => saveDraft(assignmentId, html)}
    />
  );
}
