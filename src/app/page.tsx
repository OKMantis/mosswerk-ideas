import { IdeasApp } from "@/components/IdeasApp";

export default function Home() {
  return (
    <>
      <div className="absolute inset-0 -z-10 h-[480px] bg-[radial-gradient(1200px_600px_at_80%_-10%,var(--color-glow),transparent_70%)]" />
      <header className="mx-auto w-full max-w-3xl px-4 pt-8 sm:px-5">
        <a href="https://mosswerk.com" className="text-lg font-bold tracking-tight">
          Mosswerk
        </a>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-5 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">AI Ideas</p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-[-0.035em] md:text-5xl">
          Which AI features would make your business more money?
        </h1>
        <p className="mt-5 max-w-2xl text-muted">
          Paste your website and answer up to three quick questions. You get one best first bet and two smaller
          ideas, each with its size and a rough timeline. Free, no sign-up.
        </p>
        <div className="mt-10">
          <IdeasApp />
        </div>
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 pb-10 text-sm text-muted sm:px-5">
        Built by Owen Moss ·{" "}
        <a href="https://mosswerk.com" className="text-fg hover:text-accent">
          mosswerk.com
        </a>
      </footer>
    </>
  );
}
