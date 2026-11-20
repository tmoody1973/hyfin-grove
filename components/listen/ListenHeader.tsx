import { ListenNav } from "./ListenNav";

/** "/listen/playlist", the big title, one line, and the Listen tabs. */
export function ListenHeader({ path, title, lede, active }: { path: string; title: string; lede: string; active: "playlist" | "schedule" | "shows" }) {
  return (
    <header className="border-b border-white pb-7">
      <p className="font-mono text-xs text-ink-soft">{path}</p>
      <h1 className="sg-fx sg-lines mt-3 font-display text-[clamp(56px,9vw,120px)] uppercase leading-[0.85] tracking-[-0.02em]">{title}</h1>
      <p className="mt-5 text-lg">{lede}</p>
      <div className="mt-6">
        <ListenNav active={active} />
      </div>
    </header>
  );
}
