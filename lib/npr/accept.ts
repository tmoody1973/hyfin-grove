import { toPostData, type CdsDocument, type CdsPostData } from "@/lib/cds/toPost";

/** NPR itself (service s1), as CDS names a document's owner. */
export const NPR_OWNER = "https://organization.api.npr.org/v4/services/s1";

/**
 * A CDS story HYFIN may show and copy: NPR's own (not another station's), not premium, with an npr.org original to
 * credit and point search engines to (decision 010). Anything else is null.
 */
export function acceptNprDoc(doc: CdsDocument, bylineNames?: Map<string, string>): CdsPostData | null {
  const owners = (doc as { owners?: Array<{ href: string }> }).owners ?? [];
  if (!owners.some((o) => o.href === NPR_OWNER)) return null;
  const d = toPostData(doc, bylineNames);
  if (d.premium || !d.canonicalUrl?.startsWith("https://www.npr.org/")) return null;
  return d;
}
