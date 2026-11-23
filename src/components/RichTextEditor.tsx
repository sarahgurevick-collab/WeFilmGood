"use client";

import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useEffect, useRef, useState } from "react";
import styles from "./RichTextEditor.module.css";

const ROUGE = "#e5484d";

/**
 * Repère visuel pour la relecture (23/11, Sarah) : met en rouge les marques de
 * subjectivité (« je », « à mon avis »…) pour qu'elle les remplace par « nous »,
 * « il nous semble ». C'est une simple décoration de l'écran : elle ne fait PAS
 * partie du texte, n'est jamais enregistrée ni vue par l'auteur.
 */
const SUBJECTIF = new RegExp(
  "(?<![\\p{L}\\p{N}])(?:j['’]|m['’]|(?:à mon avis|à mon sens|à mes yeux|selon moi|pour ma part|il me semble|me semble|personnellement|moi-même|moi|je|me|mon|ma|mes)(?![\\p{L}\\p{N}]))",
  "giu",
);
const SurlignerSubjectif = Extension.create({
  name: "surlignerSubjectif",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            state.doc.descendants((noeud, pos) => {
              if (!noeud.isText || !noeud.text) return;
              for (const m of noeud.text.matchAll(SUBJECTIF)) {
                const debut = pos + (m.index ?? 0);
                decos.push(
                  Decoration.inline(debut, debut + m[0].length, {
                    style: "color:#ff3b30;background:rgba(255,59,48,.2);border-radius:2px",
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },
});

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
  fiche = false,
  surlignerSubjectif = false,
}: {
  name: string;
  defaultValue?: string;
  /** Fiche de lecture : Times New Roman 12 pt, comme sous Word (16/11, Sarah). */
  fiche?: boolean;
  /** Met en rouge, à l'écran seulement, les « je » et « à mon avis » (relecture admin). */
  surlignerSubjectif?: boolean;
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
      ...(surlignerSubjectif ? [SurlignerSubjectif] : []),
    ],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: fiche ? `${styles.surface} ${styles.surfaceFiche}` : styles.surface },
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
