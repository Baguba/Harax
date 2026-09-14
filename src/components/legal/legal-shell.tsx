import Link from "next/link";
import { HaraxLogo } from "@/components/common/harax-logo";

/**
 * Standalone shell for legal pages (/privacy, /terms).
 * Renders without auth, server-side, so Google Play reviewers can fetch it.
 */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b-2 border-edge bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Back to Harax" className="flex items-center gap-3">
            <HaraxLogo size={28} />
          </Link>
          <Link
            href="/"
            className="rounded-full border-2 border-edge bg-card px-4 py-1.5 text-xs font-bold text-game-caps transition-colors hover:bg-primary"
          >
            ← Back to Harax
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm font-bold text-muted-foreground">Last updated: {updated}</p>

        <div className="game-card mt-8 space-y-8 rounded-3xl p-6 leading-relaxed sm:p-10">{children}</div>
      </main>

      <footer className="border-t-2 border-edge bg-card">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs font-bold text-muted-foreground sm:flex-row sm:px-6">
          <span>Haramaya University · Ethiopia</span>
          <span className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <h2 className="flex items-baseline gap-3 font-display text-lg font-extrabold">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-edge bg-primary text-xs font-extrabold text-game-caps">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] text-foreground/90">{children}</div>
    </section>
  );
}
