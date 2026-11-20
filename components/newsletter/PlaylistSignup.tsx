import Link from "next/link";
import { SignupBox } from "./SignupBox";

/** The playlist sidebar's newsletter card (red: the Listen channel). Someone reading the playlist is mid-listen. */
export function PlaylistSignup() {
  return (
    <section aria-labelledby="playlist-join" className="flex flex-col gap-4 border border-[#ff0040] p-5">
      <p className="m-0 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">
        <span aria-hidden className="size-2 bg-current" />
        The HYFIN Fam newsletter
      </p>
      <h2 id="playlist-join" className="m-0 font-display text-[28px] uppercase leading-[0.95]">Like what you&rsquo;re hearing?</h2>
      <p className="m-0 text-[17px] leading-[1.45]">New music, the artists we can&rsquo;t stop spinning, and first access to HYFIN events. In your inbox.</p>
      <SignupBox placement="playlist" button="Join" />
      <p className="m-0 font-mono text-xs text-ink-soft">Free. Unsubscribe anytime.</p>
    </section>
  );
}

/** Phones: one line above the song list (the sidebar sits below the whole list there), so the list isn't pushed down. */
export function PlaylistSignupBar() {
  return (
    <Link href="/newsletter" className="flex min-h-12 items-center justify-between gap-3 border border-[#ff0040] px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] lg:hidden">
      <span><span className="text-[#ff0040]">■</span> Like what you&rsquo;re hearing? Get it in your inbox</span>
      <span aria-hidden>→</span>
    </Link>
  );
}
