"use client";

import { useState } from "react";
import { MAX_QUESTIONS, type ChatMessage } from "@/lib/turns";
import { TypingDots } from "./TypingDots";

type Props = {
  history: ChatMessage[];
  streaming: string;
  busy: boolean;
  canRetry: boolean;
  onAnswer: (answer: string) => void;
  onRetry: () => void;
  onStartOver: () => void;
};

export function Chat({ history, streaming, busy, canRetry, onAnswer, onRetry, onStartOver }: Props) {
  const [answer, setAnswer] = useState("");
  const questionsAsked = history.filter((m) => m.role === "assistant").length;
  const awaitingAnswer = !busy && history.at(-1)?.role === "assistant";

  const submit = () => {
    if (!answer.trim()) return;
    onAnswer(answer.trim());
    setAnswer("");
  };

  return (
    <div className="space-y-4">
      {questionsAsked > 0 && (
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Question {questionsAsked} of {MAX_QUESTIONS}
        </p>
      )}

      <ol className="space-y-3" aria-live="polite">
        {history.map((message, i) => (
          <li key={i} className={message.role === "user" ? "flex justify-end" : ""}>
            <p
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-xl bg-glow px-4 py-3 whitespace-pre-wrap"
                  : "whitespace-pre-wrap leading-relaxed"
              }
            >
              {message.content}
            </p>
          </li>
        ))}
        {busy && (
          <li>
            {streaming ? (
              <p className="whitespace-pre-wrap leading-relaxed">{streaming}</p>
            ) : (
              <span className="inline-flex rounded-xl bg-surface px-4 py-3 text-muted">
                <TypingDots label="Thinking…" />
              </span>
            )}
          </li>
        )}
      </ol>

      {awaitingAnswer && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="answer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="answer"
            rows={3}
            maxLength={1000}
            required
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="w-full rounded-md border border-line bg-surface px-4 py-3 text-fg focus:border-accent focus:outline-none"
          />
          <button type="submit" className="cursor-pointer rounded-md bg-accent px-5 py-3 font-semibold text-ink hover:bg-accent/90">
            Send
          </button>
        </form>
      )}

      {!busy && (
        <div className="flex flex-wrap gap-3">
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="cursor-pointer rounded-md border border-line px-4 py-2 font-medium hover:border-accent"
            >
              Try again
            </button>
          )}
          <button type="button" onClick={onStartOver} className="cursor-pointer px-1 py-2 text-sm text-muted hover:text-fg">
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
