import { getCloudflareContext } from "@opennextjs/cloudflare";

const PLANS_KEY = "total-plans";
const ASSESSMENTS_KEY = "total-assessments";

async function statsKv(): Promise<KVNamespace> {
  const { env } = getCloudflareContext();
  const binding = env.STATS_KV;
  if (!binding) {
    throw new Error("STATS_KV binding is not available. Make sure it is declared in wrangler.jsonc.");
  }
  return binding;
}

export async function incrementPlanCount(): Promise<void> {
  try {
    const kv = await statsKv();
    const current = parseInt((await kv.get(PLANS_KEY)) ?? "0", 10) || 0;
    await kv.put(PLANS_KEY, String(current + 1));
  } catch { /* best-effort */ }
}

export async function incrementAssessmentCount(): Promise<void> {
  try {
    const kv = await statsKv();
    const current = parseInt((await kv.get(ASSESSMENTS_KEY)) ?? "0", 10) || 0;
    await kv.put(ASSESSMENTS_KEY, String(current + 1));
  } catch { /* best-effort */ }
}

export async function getStats(): Promise<{ plans: number; assessments: number }> {
  try {
    const kv = await statsKv();
    const [plans, assessments] = await Promise.all([
      kv.get(PLANS_KEY),
      kv.get(ASSESSMENTS_KEY),
    ]);
    return {
      plans: parseInt(plans ?? "0", 10) || 0,
      assessments: parseInt(assessments ?? "0", 10) || 0,
    };
  } catch {
    return { plans: 0, assessments: 0 };
  }
}