"use client";

import { useEffect, useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/taxonomy";
import { addNpr, findNpr, type PickerResult } from "./actions";

const NPR_MUSIC = "1039";
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
const box: React.CSSProperties = { border: "1px solid var(--theme-elevation-150)", padding: "var(--base)", display: "flex", gap: "var(--base)", alignItems: "flex-start" };

function Row({ r, onAdded }: { r: PickerResult; onAdded: (id: string, postId: number) => void }) {
  const [section, setSection] = useState<Category>(r.collectionIds.includes(NPR_MUSIC) ? "music" : "culture");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const add = () =>
    start(async () => {
      const res = await addNpr(r.id, section);
      if (res.ok) onAdded(r.id, res.postId);
      else setError(res.message);
    });
  return (
    <li style={box}>
      {r.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- NPR's image, small preview in the admin
        <img src={r.imageUrl} alt="" width={96} height={64} style={{ objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 96, height: 64, flexShrink: 0, background: "var(--theme-elevation-100)" }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <a href={r.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{r.title}</a>
        <div style={{ opacity: 0.7, fontSize: 13, marginTop: 4 }}>{date(r.publishedAt)}</div>
        {r.teaser && <p style={{ margin: "6px 0 0" }}>{r.teaser}</p>}
        {error && <p role="alert" style={{ color: "var(--theme-error-500)", margin: "6px 0 0" }}>{error}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
        {r.postId ? (
          <>
            <strong>On HYFIN</strong>
            <a href={`/admin/collections/posts/${r.postId}`}>Edit</a>
            <a href={`/npr/${encodeURIComponent(r.id)}`} target="_blank" rel="noreferrer">View on site</a>
          </>
        ) : (
          <>
            <label style={{ fontSize: 13 }}>
              Section{" "}
              <select value={section} onChange={(e) => setSection(e.target.value as Category)} disabled={pending}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn--style-primary btn--size-small" onClick={add} disabled={pending}>{pending ? "Adding…" : "Add to HYFIN"}</button>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * Admin → Add from NPR (plan 11): search NPR's stories or paste an npr.org link, pick a section, add. Added stories are
 * read-only copies that refresh every 15 minutes and credit npr.org (decision 015).
 */
export function Picker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickerResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (q: string) =>
    start(async () => {
      const res = await findNpr(q);
      setMessage(res.ok ? (res.results.length ? null : "No NPR stories found. Try other words, or paste the story's npr.org link.") : res.message);
      setResults(res.ok ? res.results : []);
    });
  useEffect(() => run(""), []); // browse once on open

  return (
    <div className="gutter--left gutter--right" style={{ paddingTop: "calc(var(--base) * 2)", paddingBottom: "calc(var(--base) * 4)", maxWidth: 960 }}>
      <h1>Add from NPR</h1>
      <p style={{ maxWidth: 720 }}>
        Search NPR&rsquo;s stories, or paste a story&rsquo;s npr.org link. An added story is a read-only copy: it refreshes every 15 minutes, credits
        NPR with a link to npr.org, and comes down if NPR withdraws it. Section, tags and featuring are yours.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        style={{ display: "flex", gap: 8, margin: "var(--base) 0" }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="orchestra noir, or https://www.npr.org/…"
          aria-label="Search NPR or paste an npr.org link"
          style={{ flex: 1, padding: "8px 12px", border: "1px solid var(--theme-elevation-250)", background: "var(--theme-input-bg)", color: "var(--theme-text)" }}
        />
        <button type="submit" className="btn btn--style-secondary btn--size-small" disabled={pending}>{pending ? "Searching…" : "Search"}</button>
      </form>
      {!query && results && <p style={{ opacity: 0.7 }}>Newest from NPR Music and NPR&rsquo;s Race coverage:</p>}
      {message && <p role="status">{message}</p>}
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {(results ?? []).map((r) => (
          <Row key={r.id} r={r} onAdded={(id, postId) => setResults((rs) => (rs ?? []).map((x) => (x.id === id ? { ...x, postId } : x)))} />
        ))}
      </ul>
    </div>
  );
}
