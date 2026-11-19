import { notFound, permanentRedirect } from "next/navigation";
import { getPostByCdsId, postPath } from "@/lib/posts";

/** Old address for CDS stories (before the sync): send it to the synced post's permanent page. */
export default async function OldStoryAddress({ params }: PageProps<"/stories/[id]">) {
  const { id } = await params;
  if (!/^[\w-]+$/.test(id)) notFound();
  const post = await getPostByCdsId(id);
  if (!post) notFound();
  permanentRedirect(postPath(post));
}
