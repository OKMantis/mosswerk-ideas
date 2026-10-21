"use client";

import { useState } from "react";
import { ApiError, postChat, postSite } from "@/lib/api-client";
import type { IdeasResult } from "@/lib/ideas-schema";
import { ERROR_MESSAGES, type ErrorCode } from "@/lib/protocol";
import type { ChatMessage } from "@/lib/turns";
import { Chat } from "./Chat";
import { ResultCards } from "./ResultCards";
import { UrlForm } from "./UrlForm";

const codeOf = (err: unknown): ErrorCode => (err instanceof ApiError ? err.code : "model_error");

export function IdeasApp() {
  const [site, setSite] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState("");
  const [result, setResult] = useState<IdeasResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);

  async function runTurn(siteText: string, turnHistory: ChatMessage[]) {
    setBusy(true);
    setError(null);
    let text = "";
    try {
      const ideas = await postChat(siteText, turnHistory, (chunk) => setStreaming((text += chunk)));
      if (ideas) setResult(ideas);
      else setHistory([...turnHistory, { role: "assistant", content: text }]);
    } catch (err) {
      setError(codeOf(err));
    } finally {
      setStreaming("");
      setBusy(false);
    }
  }

  async function start(url: string) {
    setBusy(true);
    setError(null);
    try {
      const text = await postSite(url);
      setSite(text);
      await runTurn(text, []);
    } catch (err) {
      setError(codeOf(err));
      setBusy(false);
    }
  }

  function answer(content: string) {
    const next: ChatMessage[] = [...history, { role: "user", content }];
    setHistory(next);
    void runTurn(site!, next);
  }

  function startOver() {
    setSite(null);
    setHistory([]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-md border border-line bg-surface px-4 py-3 text-sm">
          {ERROR_MESSAGES[error]}
        </p>
      )}
      {result ? (
        <ResultCards result={result} onStartOver={startOver} />
      ) : site ? (
        <Chat
          history={history}
          streaming={streaming}
          busy={busy}
          canRetry={!busy && error !== null && history.at(-1)?.role !== "assistant"}
          onAnswer={answer}
          onRetry={() => void runTurn(site, history)}
        />
      ) : (
        <UrlForm busy={busy} onSubmit={(url) => void start(url)} />
      )}
    </div>
  );
}
