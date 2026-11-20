import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/pwa/ServiceWorker";
import { SignupBox } from "@/components/newsletter/SignupBox";
import Link from "next/link";
import { Archivo, Archivo_Black, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/seo";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { SiteLogo } from "@/components/brand/SiteLogo";
import { StabilizeSwitch } from "@/components/brand/StabilizeSwitch";
import { STABLE_SCRIPT } from "@/lib/signal";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  // Canonical and social links become absolute on the site's real address (NEXT_PUBLIC_SITE_URL).
  metadataBase: new URL(SITE_URL),
  title: { default: "HYFIN", template: "%s · HYFIN" },
  description: "HYFIN: Black music and culture from Radio Milwaukee.",
  // Installed on an iPhone (plan 15): full-screen, named HYFIN. "black" (not translucent) until the phone shell adds
  // safe-area padding in phase B.
  appleWebApp: { capable: true, title: "HYFIN", statusBarStyle: "black" },
};

export const viewport: Viewport = { themeColor: "#000000" };

const NAV = [
  { href: "/music", label: "Music" },
  { href: "/culture", label: "Culture" },
  { href: "/milwaukee", label: "Milwaukee" },
  { href: "/listen/playlist", label: "Listen" },
  { href: "/events", label: "Events" },
];

const FOOTER = [
  { href: "/listen/schedule", label: "Schedule" },
  { href: "/listen/playlist", label: "Playlist" },
  { href: "/events", label: "Events" },
  { href: "/support", label: "Support" },
  { href: "/feed.xml", label: "RSS" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable} ${plexMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Before first paint: a saved Stabilize choice calms the glitch with no flicker (sets data-stable on <html>). */}
        <script dangerouslySetInnerHTML={{ __html: STABLE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* A plain tag, not metadata.alternates: pages that set a canonical would replace that whole block. React hoists it into <head>. */}
        <link rel="alternate" type="application/rss+xml" title="HYFIN" href="/feed.xml" />
        <PlayerProvider>
          <header className="border-b border-white px-[clamp(20px,4vw,60px)] py-4">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-9 gap-y-2.5">
              <div className="flex min-h-11 items-center gap-3">
                <SiteLogo className="h-8" />
                <span className="font-mono text-[11px] tracking-[0.08em] text-ink-soft">/urban-alternative/mke</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <nav aria-label="Main" className="flex flex-wrap gap-x-6">
                  {NAV.map((item) => (
                    <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.1em] hover:text-[#00ff9f]">
                      {item.label}
                    </Link>
                  ))}
                  {/* Not a section: green with the ■ marker so it reads as the newsletter, on every page (plan 14 follow-up). */}
                  <Link href="/newsletter" className="inline-flex min-h-11 items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-[#00ff9f] hover:text-white">
                    <span aria-hidden className="size-2 bg-current" />
                    Newsletter
                  </Link>
                </nav>
                <Link href="/support" className="inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] hover:bg-white hover:text-black">
                  Support
                </Link>
                <StabilizeSwitch />
              </div>
            </div>
          </header>
          <PlayerBar />
          <main className="w-full flex-1">{children}</main>
          <footer className="mt-20 border-t border-white px-[clamp(20px,4vw,60px)] py-12">
            <div className="mx-auto max-w-[1320px]">
              <SiteLogo className="h-12" />
              <p className="mt-3 font-mono text-[13px] text-ink-soft">A media movement from Radio Milwaukee.</p>
              <nav aria-label="Footer" className="mt-6 flex flex-wrap gap-x-6 font-mono text-xs uppercase tracking-[0.1em]">
                {FOOTER.map((item) => (
                  <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center hover:text-[#00ff9f]">
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-8 max-w-[520px]">
                <p className="m-0 mb-3 font-mono text-xs uppercase tracking-[0.1em]">
                  <Link href="/newsletter" className="hover:text-[#00ff9f]">The HYFIN Fam newsletter</Link>
                </p>
                <SignupBox placement="footer" />
              </div>
              {/* Staff quick-add (plan 9, task 6): asks for a Radio Milwaukee Google sign-in; robots.txt keeps /staff out of search. */}
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                <Link href="/staff/add-event" rel="nofollow" className="inline-flex min-h-11 items-center hover:text-[#00ff9f]">
                  Add an event · staff only
                </Link>
              </p>
            </div>
          </footer>
          <ServiceWorker />
        </PlayerProvider>
      </body>
    </html>
  );
}
