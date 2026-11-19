import Image from "next/image";
import type { BodyBlock } from "@/lib/cds/toPost";

/** Story text synced from CDS: sanitized HTML blocks (lib/cds/toPost.ts) and images, in Brightspot's order. */
export function CdsBody({ blocks, className }: { blocks: BodyBlock[]; className?: string }) {
  return (
    <div className={className}>
      {blocks.map((block) =>
        block.kind === "html" ? (
          <div key={block.id} dangerouslySetInnerHTML={{ __html: block.html }} />
        ) : (
          <figure key={block.id} className="my-8">
            <Image src={block.src} alt={block.caption ?? ""} width={block.width} height={block.height} sizes="(min-width: 768px) 720px, 100vw" className="w-full" />
            {(block.caption || block.credit) && (
              <figcaption className="mt-2 font-mono text-xs text-ink-soft">{[block.caption, block.credit].filter(Boolean).join(" · ")}</figcaption>
            )}
          </figure>
        ),
      )}
    </div>
  );
}
