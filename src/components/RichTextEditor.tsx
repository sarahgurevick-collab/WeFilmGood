"use client";

import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import styles from "./RichTextEditor.module.css";

const ROUGE = "#e5484d";

/**
 * Éditeur des fiches de lecture. Les lecteurs rédigent sous Word puis
 * collent : TipTap reconstruit le texte dans son propre modèle, ce qui
 * conserve gras, italique, titres et listes tout en écartant le balisage
 * parasite que produit Word.
 *
 * Le contenu est recopié dans un champ caché pour partir avec le
 * formulaire, les actions serveur recevant des données de formulaire
 * classiques.
 */
export default function RichTextEditor({
  name,
  defaultValue = "",
  onDraft,
}: {
  name: string;
  defaultValue?: string;
  /** Appelé après une pause dans la frappe, pour conserver le brouillon. */
  onDraft?: (html: string) => Promise<string | null>;
}) {
  const [html, setHtml] = useState(defaultValue);
  const [enregistre, setEnregistre] = useState<string | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const planifier = (valeur: string) => {
    if (!onDraft) return;
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(async () => {
      const date = await onDraft(valeur);
      if (date) setEnregistre(date);
    }, 2500);
  };

  useEffect(() => () => {
    if (minuterie.current) clearTimeout(minuterie.current);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        underline: false,
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: styles.surface },
    },
    onUpdate: ({ editor }) => {
      const valeur = editor.getHTML();
      setHtml(valeur);
      planifier(valeur);
    },
  });

  const bouton = (actif: boolean) => (actif ? styles.buttonActive : styles.button);

  return (
    <div className={styles.wrapper}>
      {editor && (
        <div className={styles.toolbar}>
          <button
            type="button"
            className={bouton(editor.isActive("bold"))}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            Gras
          </button>
          <button
            type="button"
            className={bouton(editor.isActive("italic"))}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            Italique
          </button>
          <button
            type="button"
            className={bouton(editor.isActive("underline"))}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            Souligné
          </button>
          <button
            type="button"
            className={bouton(editor.isActive("textStyle", { color: ROUGE }))}
            onClick={() =>
              editor.isActive("textStyle", { color: ROUGE })
                ? editor.chain().focus().unsetColor().run()
                : editor.chain().focus().setColor(ROUGE).run()
            }
          >
            Rouge
          </button>
          <button
            type="button"
            className={bouton(editor.isActive("heading", { level: 2 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            Titre
          </button>
          <button
            type="button"
            className={bouton(editor.isActive("heading", { level: 3 }))}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            Sous-titre
          </button>
          <button
            type="button"
            className={bouton(editor.isActive("bulletList"))}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            Liste
          </button>
          <button
            type="button"
            className={bouton(editor.isActive("blockquote"))}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            Citation
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />

      {onDraft && (
        <p className={styles.brouillon}>
          {enregistre
            ? `Brouillon enregistré à ${new Date(enregistre).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : "Votre texte est enregistré automatiquement pendant que vous écrivez."}
        </p>
      )}
    </div>
  );
}
