import MarcheRouge from "@/components/MarcheRouge";

/* Pendant qu'une page se charge : l'escalier rouge au centre de l'écran. */
export default function Chargement() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: "var(--bg)", zIndex: 50 }}>
      <MarcheRouge />
    </div>
  );
}
