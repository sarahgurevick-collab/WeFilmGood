/**
 * Marque WeFilmGood : disque plein, triangle évidé. Reprise du favicon,
 * en SVG pour rester net à toutes les tailles, et inversée puisque le
 * fond du site est noir.
 */
export default function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="WeFilmGood"
    >
      <circle cx="50" cy="50" r="50" fill="var(--fg)" />
      <path d="M50 26 L72 68 L28 68 Z" fill="var(--bg)" />
    </svg>
  );
}
