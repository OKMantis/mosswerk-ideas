/** Three bouncing dots, like a messenger's "typing" indicator. Without a label it's decoration only. */
export function TypingDots({ label }: { label?: string }) {
  return (
    <span role={label ? "status" : undefined} aria-hidden={!label} className="inline-flex items-center gap-1">
      {label && <span className="sr-only">{label}</span>}
      {["[animation-delay:-0.3s]", "[animation-delay:-0.15s]", ""].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className={`size-1.5 animate-bounce rounded-full bg-current motion-reduce:animate-pulse ${delay}`}
        />
      ))}
    </span>
  );
}
