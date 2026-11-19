import type { DefaultNodeTypes, SerializedBlockNode, SerializedLinkNode } from "@payloadcms/richtext-lexical";
import { type JSXConvertersFunction, LinkJSXConverter, RichText } from "@payloadcms/richtext-lexical/react";
import { AudioBlock } from "@/components/story/AudioBlock";
import { EmbedBlock } from "@/components/story/EmbedBlock";
import type { EmbedProvider } from "@/lib/embeds";
import { internalLinkHref } from "@/lib/postPath";

type EmbedFields = { url: string; provider?: EmbedProvider | null; title?: string | null };
type AudioFields = { url: string; title?: string | null };
type NodeTypes = DefaultNodeTypes | SerializedBlockNode<EmbedFields> | SerializedBlockNode<AudioFields>;

/**
 * How story text is drawn: links to other stories point at their address (Payload's default renders "#"),
 * and Embed/Audio blocks become allowlisted players.
 */
const convertersFor = (href: string): JSXConvertersFunction<NodeTypes> => ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({
    internalDocToHref: ({ linkNode }: { linkNode: SerializedLinkNode }) =>
      linkNode.fields.doc ? internalLinkHref(linkNode.fields.doc) : "#",
  }),
  blocks: {
    embed: ({ node }: { node: SerializedBlockNode<EmbedFields> }) => <EmbedBlock {...node.fields} />,
    audio: ({ node }: { node: SerializedBlockNode<AudioFields> }) => <AudioBlock url={node.fields.url} title={node.fields.title} href={href} />,
  },
});

/** Rich text from the admin (posts and pages), with our link, embed and audio rendering. */
export function RichBody({ data, href, className }: { data: Parameters<typeof RichText>[0]["data"]; href: string; className?: string }) {
  return <RichText data={data} converters={convertersFor(href)} className={className} />;
}
