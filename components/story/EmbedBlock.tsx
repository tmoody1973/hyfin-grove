import { embedFromUrl, isSocial, playerHeight, PROVIDER_NAMES, type EmbedProvider } from "@/lib/embeds";

/** Limits what a framed player may do; it can still play, go fullscreen and open its own links. */
const SANDBOX = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation";

const isWebUrl = (u: string) => /^https?:\/\//i.test(u);

/**
 * A stored embed, drawn on the story page. The allowlist runs again here, so a bad URL that somehow got
 * saved still never becomes an iframe. Social posts become a link card: no third-party scripts load.
 */
export function EmbedBlock({ url, title }: { url: string; provider?: EmbedProvider | null; title?: string | null }) {
  const embed = embedFromUrl(url, title ?? null);
  if (!embed) {
    return <p>{isWebUrl(url) ? <a href={url} rel="noopener noreferrer">{title || url}</a> : title || url}</p>;
  }
  if (isSocial(embed.provider)) {
    return (
      <p className="my-8">
        <a
          href={embed.url}
          rel="noopener noreferrer"
          aria-label={`View ${PROVIDER_NAMES[embed.provider]} post ${embed.url.split("/").filter(Boolean).pop()}`}
          className="inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.06em] !text-white !no-underline hover:!text-[#00ff9f]"
        >
          View on {PROVIDER_NAMES[embed.provider]} →
        </a>
      </p>
    );
  }
  const height = playerHeight(embed);
  const label = embed.title?.trim() || (embed.provider === "youtube" ? "YouTube video" : `${PROVIDER_NAMES[embed.provider]} player`);
  return (
    <figure className="my-8">
      <iframe
        src={embed.url}
        title={label}
        loading="lazy"
        sandbox={SANDBOX}
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        {...(height === "16:9" ? { className: "aspect-video w-full border-0" } : { height, className: "w-full border-0" })}
      />
    </figure>
  );
}
