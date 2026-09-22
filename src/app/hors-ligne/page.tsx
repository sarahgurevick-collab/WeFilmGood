/**
 * Ce que l'application affiche sans réseau. Page autonome, sans
 * données ni session : c'est la seule que le service worker garde.
 */
export const metadata = { title: "Hors ligne — WeFilmGood" };

export default function HorsLignePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        background: "#000",
        color: "#ededed",
        textAlign: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icone-192.png" alt="WeFilmGood" width={96} height={96} />
      <h1 style={{ margin: 0, fontSize: 22 }}>Pas de connexion</h1>
      <p style={{ margin: 0, maxWidth: 320, lineHeight: 1.5, color: "#9a9a9a" }}>
        WeFilmGood a besoin d&apos;internet. Dès que le réseau revient, rechargez la page.
      </p>
    </main>
  );
}
