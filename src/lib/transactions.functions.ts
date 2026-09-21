import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Json } from "@/integrations/supabase/types";

const vectorSchema = z.object({
  amount: z.number().min(0).max(1000000),
  time: z.number().min(0).max(172800),
  v14: z.number().min(-20).max(20),
  v4: z.number().min(-20).max(20),
  v12: z.number().min(-20).max(20),
  v10: z.number().min(-20).max(20),
});

function createPublicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Transaction monitoring is temporarily unavailable.");

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function calculateRisk(input: z.infer<typeof vectorSchema>) {
  const forcedBlock = input.amount > 5000 || input.v14 < -2.5;
  const score = Math.min(
    100,
    Math.round(
      Math.min(input.amount / 5000, 1) * 22 +
        Math.min(Math.max(-input.v14, 0) / 4, 1) * 34 +
        Math.min(Math.abs(input.v4) / 5, 1) * 12 +
        Math.min(Math.max(-input.v12, 0) / 4, 1) * 16 +
        Math.min(Math.max(-input.v10, 0) / 4, 1) * 12 +
        ((input.time % 86400) < 18000 ? 4 : 0),
    ),
  );
  const riskScore = forcedBlock ? Math.max(score, 96) : score;
  const status = forcedBlock ? "Blocked" : riskScore >= 60 ? "Flagged" : "Cleared";
  return { riskScore, status } as const;
}

export const listTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await createPublicClient()
    .from("monitored_transactions")
    .select("id,timestamp,card_holder,amount,location,pca_vectors,risk_score,status")
    .order("timestamp", { ascending: false })
    .limit(100);
  if (error) throw new Error("Unable to load monitored transactions.");
  return data;
});

export const analyzeTransaction = createServerFn({ method: "POST" })
  .inputValidator((input) => vectorSchema.parse(input))
  .handler(async ({ data }) => {
    const result = calculateRisk(data);
    const pcaVectors: Json = {
      Time: data.time,
      V14: data.v14,
      V4: data.v4,
      V12: data.v12,
      V10: data.v10,
    };
    const { data: transaction, error } = await createPublicClient()
      .from("monitored_transactions")
      .insert({
        card_holder: "Sandbox Vector",
        amount: data.amount,
        location: "Risk Lab",
        pca_vectors: pcaVectors,
        risk_score: result.riskScore,
        status: result.status,
      })
      .select("id,timestamp,card_holder,amount,location,pca_vectors,risk_score,status")
      .single();
    if (error) throw new Error("Unable to record the analyzed transaction.");
    return { ...result, transaction };
  });