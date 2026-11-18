import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"] });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });

export const metadata: Metadata = {
  title: { default: "Ladies First · HYFIN", template: "%s · Ladies First" },
  description: "Conversations with women shaping music, from HYFIN in Milwaukee.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-rule">
          <div className="mx-auto flex w-full max-w-3xl items-baseline justify-between px-5 py-5">
            <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
              Ladies First
            </Link>
            <span className="text-xs uppercase tracking-[0.2em] text-ink-soft">
              HYFIN <span className="text-accent">·</span> Radio Milwaukee
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-5">{children}</main>
        <footer className="mt-20 border-t border-rule">
          <p className="mx-auto max-w-3xl px-5 py-6 text-xs text-ink-soft">
            Test site. Content from NPR&apos;s Content Distribution Service. Audio hosted by Dovetail.
          </p>
        </footer>
      </body>
    </html>
  );
}
