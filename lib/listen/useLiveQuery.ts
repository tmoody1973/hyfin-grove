"use client";

import { ConvexClient } from "convex/browser";
import { anyApi, type FunctionReference } from "convex/server";
import { useEffect, useState } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL ?? "";

/**
 * Live value of an rm-playlist public query ("plays:recentByStation"), starting from the server-rendered
 * `initial`. Disabled → stays `initial`. A failed subscription keeps the last good value.
 */
export function useLiveQuery<T, R = T>(
  name: `${string}:${string}`,
  args: Record<string, unknown>,
  initial: T,
  enabled = true,
  /** Combine each update with the current value instead of replacing it. */
  reduce?: (current: T, update: R) => T,
): T {
  const [value, setValue] = useState(initial);
  const key = JSON.stringify(args);
  useEffect(() => {
    if (!enabled || !CONVEX_URL) return;
    const [mod, fn] = name.split(":");
    const client = new ConvexClient(CONVEX_URL);
    const ref = (anyApi as unknown as Record<string, Record<string, FunctionReference<"query">>>)[mod][fn];
    const stop = client.onUpdate(ref, JSON.parse(key), (v: R) => setValue((cur) => (reduce ? reduce(cur, v) : (v as unknown as T))), () => {});
    return () => {
      stop();
      void client.close();
    };
  }, [name, key, enabled, reduce]);
  return value;
}
