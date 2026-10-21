import type { Idea, IdeasResult } from "@/lib/ideas-schema";

const BOOKING_URL = "https://calendar.app.google/A3UYyubyPp7ND7qKA";

const MONEY_LABELS: Record<Idea["moneyAngle"]["kind"], string> = {
  fewer_lost_sales: "Fewer lost sales",
  hours_saved: "Hours saved per week",
  more_revenue: "More revenue",
};

function IdeaBody({ idea }: { idea: Idea }) {
  return (
    <>
      <p className="mt-3 text-muted">{idea.whyItFits}</p>
      <p className="mt-4 text-sm">
        <span className="font-semibold text-accent">{MONEY_LABELS[idea.moneyAngle.kind]}:</span> {idea.moneyAngle.detail}
      </p>
      <p className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-muted">
        <span className="rounded-full border border-line px-3 py-1 capitalize">{idea.size}</span>
        <span className="rounded-full border border-line px-3 py-1">{idea.timeline}</span>
      </p>
    </>
  );
}

export function ResultCards({ result, onStartOver }: { result: IdeasResult; onStartOver: () => void }) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="best-bet">
        <h2 id="best-bet" className="text-3xl font-bold tracking-tight">
          Your best first bet
        </h2>
        <article className="mt-5 rounded-xl border border-line bg-surface p-6 ring-1 ring-accent md:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Best first bet</p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight">{result.bestBet.title}</h3>
          <IdeaBody idea={result.bestBet} />
        </article>
      </section>

      <section aria-labelledby="smaller-ideas">
        <h2 id="smaller-ideas" className="text-xl font-bold tracking-tight">
          Two smaller ideas
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {result.smallerIdeas.map((idea) => (
            <article key={idea.title} className="flex flex-col rounded-xl border border-line bg-surface p-6">
              <h3 className="text-lg font-bold tracking-tight">{idea.title}</h3>
              <IdeaBody idea={idea} />
            </article>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener"
          className="rounded-md bg-accent px-5 py-3 text-center font-semibold text-ink hover:bg-accent/90"
        >
          Book a call about this
        </a>
        <button
          type="button"
          onClick={onStartOver}
          className="cursor-pointer rounded-md border border-line px-5 py-3 font-medium hover:border-accent"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
