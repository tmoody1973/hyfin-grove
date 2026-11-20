"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

type TurnstileApi = { render: (el: HTMLElement, o: { sitekey: string; theme: "dark" }) => string; remove: (id: string) => void };
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare's human check. It adds a hidden `cf-turnstile-response` input to the surrounding form.
 */
export function Turnstile({ siteKey }: { siteKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const mount = useCallback(() => {
    if (ref.current && window.turnstile && id.current === null) id.current = window.turnstile.render(ref.current, { sitekey: siteKey, theme: "dark" });
  }, [siteKey]);
  useEffect(() => {
    mount();
    return () => {
      if (id.current) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, [mount]);
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={mount} />
      <div ref={ref} />
    </>
  );
}
