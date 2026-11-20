/** "Is HYFIN running as the installed app?", for useSyncExternalStore (client only; the server answers false). */
const STANDALONE = "(display-mode: standalone)";

export const subscribeStandalone = (cb: () => void) => {
  const mq = window.matchMedia(STANDALONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export const isStandalone = () => window.matchMedia(STANDALONE).matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const serverFalse = () => false;
