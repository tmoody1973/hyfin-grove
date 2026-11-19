"use client";

import { ConvexClient } from "convex/browser";
import { anyApi, type FunctionReference } from "convex/server";
import { useEffect, useState } from "react";

const CONVEX_URL = process.env.NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL ?? "";

/**
 * Live value of an rm-playlist public query ("plays:recentByStation"), starting from the server-rendered
 * `initial`. Disabled → stays `initial`. A failed subscription keeps the last good value.
 */
export function useLiveQuery<T>(name: `${string}:${string}`, args: Record<string, unknown>, initial: T, enabled = true): T {
  const [value, setValue] = useState(initial);
  const key = JSON.stringify(args);
  useEffect(() => {
    if (!enabled || !CONVEX_URL) return;
    const [mod, fn] = name.split(":");
    const client = new ConvexClient(CONVEX_URL);
    const ref = (anyApi as unknown as Record<string, Record<string, FunctionReference<"query">>>)[mod][fn];
    const stop = client.onUpdate(ref, JSON.parse(key), (v: T) => setValue(v), () => {});
    return () => {
      stop();
      void client.close();
    };
  }, [name, key, enabled]);
  return value;
}
