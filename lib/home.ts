/** schema.org RadioStation for the homepage, serialized for a <script type="application/ld+json"> tag. */
export function radioStationJsonLd(siteUrl: string): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "RadioStation",
    name: "HYFIN",
    url: siteUrl,
    description: "Black music and culture from Radio Milwaukee.",
    parentOrganization: { "@type": "Organization", name: "Radio Milwaukee", url: "https://radiomilwaukee.org" },
    sameAs: ["https://hyfin.org"],
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** The site as schema.org WebSite with a SearchAction, so Google can show a HYFIN search box (plan 12). */
export function websiteJsonLd(siteUrl: string): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "HYFIN",
    url: siteUrl,
    potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/search?q={search_term_string}` }, "query-input": "required name=search_term_string" },
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Songs in the homepage Signal log. Lives here, not in the client component: a server import of a value from a "use client" file is a placeholder, not the value. */
export const SIGNAL_LOG_SIZE = 12;
