"use client";

import { useEffect } from "react";
import { FUNRAISE_ORG_ID, PLANS } from "@/lib/support";

type FunraiseQueue = unknown[] & { push: (...args: unknown[]) => void; loading?: boolean; scriptIsLoading?: boolean; scriptIsLoaded?: boolean };

declare global {
  interface Window {
    funraise?: FunraiseQueue;
  }
}

type SuccessHandler = (formId: number, data: unknown) => void;

// Module-level, so a second visit after client-side navigation neither injects the script again nor stacks
// another onSuccess callback; the registered callbacks always call the newest handler.
let injected = false;
const registered = new Set<number>();
let current: SuccessHandler | null = null;

/**
 * Funraise's "Aware Code" loader (verbatim from hyfin.org's <head>, 2026-11-20), as a function so it runs before our
 * own commands: it queues "init" on window.funraise and adds inject-form.js, which then replays the queue.
 */
function inject() {
  if (injected) return;
  injected = true;
  const data = { window, document, tag: "script", data: "funraise", orgId: FUNRAISE_ORG_ID, uri: "https://assets.funraise.io", common: "/widget/common/2.0", client: "/widget/client", script: "/inject-form.js" };
  const q = (window.funraise ??= [] as unknown as FunraiseQueue);
  if (q.scriptIsLoading || q.scriptIsLoaded) return;
  q.loading = true;
  q.push("init", data);
  const s = document.createElement("script");
  s.async = true;
  s.src = `${data.uri}${data.common}${data.script}?orgId=${data.orgId}`;
  document.head.appendChild(s);
}

/**
 * Loads Funraise on this page only and turns each plan's form into a popup: any element with data-formId opens it
 * (Funraise listens for clicks on document.body). Tells `onSuccess` when a gift goes through.
 */
export function Funraise({ onSuccess }: { onSuccess: SuccessHandler }) {
  useEffect(() => {
    current = onSuccess;
    inject();
    const fr = window.funraise;
    if (!fr) return;
    for (const { formId } of PLANS) {
      if (registered.has(formId)) continue;
      registered.add(formId);
      fr.push("create", { form: formId });
      fr.push("onSuccess", { form: formId }, (result: unknown) => current?.(formId, result));
    }
    return () => {
      if (current === onSuccess) current = null;
    };
  }, [onSuccess]);
  return null;
}
