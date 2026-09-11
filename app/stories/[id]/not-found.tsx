import Link from "next/link";

export default function StoryNotFound() {
  return (
    <div className="py-24 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="font-display mt-3 text-4xl font-medium">That episode isn&apos;t here.</h1>
      <p className="mt-4 text-ink-soft">It may have been unpublished, or the link is wrong.</p>
      <Link href="/" className="mt-8 inline-block text-accent underline underline-offset-4">Back to all episodes</Link>
    </div>
  );
}
