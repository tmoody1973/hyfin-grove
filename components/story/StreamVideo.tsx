/** NPR's own video (an HLS stream, e.g. Tiny Desk) with the browser's controls. Nothing loads until play. */
export function StreamVideo({ src, poster, title }: { src: string; poster: string | null; title: string | null }) {
  return (
    <video controls playsInline preload="none" src={src} poster={poster ?? undefined} aria-label={title ?? "Video"} className="aspect-video w-full bg-black">
      <a href={src}>Watch the video</a>
    </video>
  );
}
