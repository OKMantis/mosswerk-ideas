"use client";

import { useState } from "react";
import { TypingDots } from "./TypingDots";

export function UrlForm({ busy, onSubmit }: { busy: boolean; onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) onSubmit(url.trim());
      }}
    >
      <label htmlFor="website" className="block text-sm font-medium text-muted">
        Your website
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* type="text", not "url": founders type "acme.com", which a url input rejects. */}
        <input
          id="website"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          required
          maxLength={2048}
          value={url}
          disabled={busy}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-4 py-3 text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-md bg-accent px-5 py-3 font-semibold text-ink hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              Reading your site <TypingDots />
            </span>
          ) : (
            "Get ideas"
          )}
        </button>
      </div>
    </form>
  );
}
