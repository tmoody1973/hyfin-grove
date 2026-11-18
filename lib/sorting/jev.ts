/** TypeSafe System One over HTTP. Shapes per docs.typesafe.ai (read 2026-11-18); ported from Backstory. */
export const JEV_URL = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";
export const JEV_TIMEOUT_MS = 30_000;

export type JevQuestion = Record<string, unknown>;
export type JevAnswer = {
  type?: string;
  noul?: number;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
};
export type JevResponse = {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: { input_tokens: number; output_tokens: number };
};

/** One evaluation. Any HTTP error throws: callers fail that post rather than guess. */
export async function askJev(
  state: string,
  questions: Record<string, JevQuestion>,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = JEV_TIMEOUT_MS,
): Promise<JevResponse> {
  const response = await fetchImpl(JEV_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ state, model: JEV_MODEL, questions }),
  });
  if (!response.ok) throw new Error(`TypeSafe request failed: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  return (await response.json()) as JevResponse;
}
