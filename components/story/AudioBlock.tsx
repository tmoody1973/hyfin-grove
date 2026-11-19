import { PlayButton } from "@/components/player/PlayButton";

/** An MP3 inside a story: plays in the persistent player like any story audio. */
export function AudioBlock({ url, title, href }: { url: string; title?: string | null; href: string }) {
  return (
    <div className="my-8 flex flex-wrap items-center gap-4 border border-white p-4">
      <PlayButton url={url} title={title || "Audio"} href={href} />
      {title && <span className="text-[17px] font-semibold">{title}</span>}
    </div>
  );
}
