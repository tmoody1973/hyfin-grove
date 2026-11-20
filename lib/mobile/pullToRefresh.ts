/**
 * Pull down to refresh in the installed app (plan 15, task 7): iOS gives home-screen web apps no pull-to-refresh, so
 * people would be stuck on old news. The indicator follows the finger at half speed, capped at 96 px.
 */
const MAX = 96;
const READY = 70;

export function pullState(fingerTravel: number): { offset: number; ready: boolean } {
  const offset = Math.min(MAX, Math.max(0, Math.floor(fingerTravel / 2)));
  return { offset, ready: offset >= READY };
}
