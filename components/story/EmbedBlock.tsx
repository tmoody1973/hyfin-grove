import { embedFromUrl, isSocial, playerHeight, type EmbedProvider } from "@/lib/embeds";

const SOCIAL_LABEL: Partial<Record<EmbedProvider, string>> = { instagram: "Instagram", twitter: "X", tiktok: "TikTok" };

/**
 * A stored embed, drawn on the story page. The allowlist runs again here, so a bad URL that somehow got
 * saved still never becomes an iframe. Social posts become a link card: no third-party scripts load.
 */
export function EmbedBlock({ url, title }: { url: string; provider?: EmbedProvider | null; title?: string | null }) {
  const embed = embedFromUrl(url, title ?? null);
  if (!embed) {
    return (
      <p>
        <a href={url} rel="noopener noreferrer">{title || url}</a>
      </p>
    );
  }
  if (isSocial(embed.provider)) {
    return (
      <p className="my-8">
        <a
          href={embed.url}
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.06em] !text-white !no-underline hover:!text-[#00ff9f]"
        >
          View on {SOCIAL_LABEL[embed.provider]} →
        </a>
      </p>
    );
  }
  const height = playerHeight(embed);
  const label = embed.title ?? `${embed.provider} player`;
  return (
    <figure className="my-8">
      <iframe
        src={embed.url}
        title={label}
        loading="lazy"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        {...(height === "16:9" ? { className: "aspect-video w-full border-0" } : { height, className: "w-full border-0" })}
      />
    </figure>
  );
}
