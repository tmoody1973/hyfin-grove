import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Archivo_Black, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { PlayerBar } from "@/components/player/PlayerBar";
import { PlayerProvider } from "@/components/player/PlayerProvider";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: { default: "HYFIN", template: "%s · HYFIN" },
  description: "HYFIN: Black music and culture from Radio Milwaukee.",
};

const NAV = [
  { href: "/music", label: "Music" },
  { href: "/culture", label: "Culture" },
  { href: "/milwaukee", label: "Milwaukee" },
  { href: "/listen", label: "Listen" },
  { href: "/events", label: "Events" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <PlayerProvider>
          <header className="border-b border-white px-[clamp(20px,4vw,60px)] py-4">
            <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-9 gap-y-2.5">
              <Link href="/" className="flex min-h-11 items-baseline gap-3">
                <span className="font-display text-4xl leading-tight tracking-[-0.01em]">HYFIN</span>
                <span className="font-mono text-[11px] tracking-[0.08em] text-ink-soft">/urban-alternative/mke</span>
              </Link>
              <nav aria-label="Main" className="flex flex-wrap gap-x-6">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.1em] hover:text-[#00ff9f]">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <PlayerBar />
          <main className="w-full flex-1">{children}</main>
          <footer className="mt-20 border-t border-white px-[clamp(20px,4vw,60px)] py-12">
            <div className="mx-auto max-w-[1320px]">
              <div className="font-display text-5xl leading-none tracking-[-0.02em]">HYFIN</div>
              <p className="mt-3 font-mono text-[13px] text-ink-soft">A media movement from Radio Milwaukee.</p>
            </div>
          </footer>
        </PlayerProvider>
      </body>
    </html>
  );
}
