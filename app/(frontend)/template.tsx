import { ViewTransition } from "react";

/**
 * App-style screen changes on phones (plan 15, task 7; React's <ViewTransition>, built into Next 16.4). A template
 * re-mounts on every navigation, unlike the layout, so enter and exit fire for each page. Links say which way:
 * "nav-forward" (into a story), "nav-tab" (the tab bar). Anything else, including the browser's back, just swaps.
 * The animations live in globals.css, phones only, and off for reduced motion and Stabilize.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const types = { "nav-forward": "nav-forward", "nav-tab": "nav-tab", default: "none" };
  return (
    <ViewTransition enter={types} exit={types} default="none">
      {children}
    </ViewTransition>
  );
}
