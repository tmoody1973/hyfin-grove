import Image from "next/image";
import type { BodyBlock } from "@/lib/cds/toPost";
import { EmbedBlock } from "./EmbedBlock";
import { StreamVideo } from "./StreamVideo";

/** Story text synced from CDS: sanitized HTML blocks (lib/cds/toPost.ts), images and allowlisted players, in Brightspot's order. */
export function CdsBody({ blocks, className }: { blocks: BodyBlock[]; className?: string }) {
  return (
    <div className={className}>
      {blocks.map((block) =>
        block.kind === "html" ? (
          <div key={block.id} className="mb-6" dangerouslySetInnerHTML={{ __html: block.html }} />
        ) : block.kind === "embed" ? (
          <div key={block.id} className="my-8">
            <EmbedBlock url={block.url} provider={block.provider} title={block.title} />
          </div>
        ) : block.kind === "video" ? (
          <figure key={block.id} className="my-8">
            <StreamVideo src={block.src} poster={block.poster} title={block.title} />
            {block.title && <figcaption className="mt-2 font-mono text-xs text-ink-soft">{block.title}</figcaption>}
          </figure>
        ) : block.kind === "image" ? (
          <figure key={block.id} className="my-8">
            <Image src={block.src} alt={block.caption ?? ""} width={block.width} height={block.height} sizes="(min-width: 768px) 720px, 100vw" className="w-full" />
            {(block.caption || block.credit) && (
              <figcaption className="mt-2 font-mono text-xs text-ink-soft">{[block.caption, block.credit].filter(Boolean).join(" · ")}</figcaption>
            )}
          </figure>
        ) : null,
      )}
    </div>
  );
}
