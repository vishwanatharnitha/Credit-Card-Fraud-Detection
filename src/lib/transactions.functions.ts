import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database, Json } from "@/integrations/supabase/types";
import { scoreFraudVector } from "@/lib/fraud-model";

const vectorSchema = z.object({
  amount: z.number().finite().min(0).max(1_000_000),
  time: z.number().finite().min(0).max(172800),
  v14: z.number().finite().min(-20).max(20),
  v4: z.number().finite().min(-20).max(20),
  v12: z.number().finite().min(-20).max(20),
  v10: z.number().finite().min(-20).max(20),
});
const diagnosticSchema = vectorSchema.extend({ threshold: z.number().min(0.05).max(0.95).default(0.5) });
const batchRowSchema = diagnosticSchema.extend({ cardHolder: z.string().trim().min(1).max(100), location: z.string().trim().min(1).max(100) });
const batchSchema = z.object({ rows: z.array(batchRowSchema).min(1).max(500) });

function createPublicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !key) throw new Error("Transaction monitoring is temporarily unavailable.");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  } } });
}

export const listTransactions = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await createPublicClient().from("monitored_transactions").select("id,timestamp,card_holder,amount,location,pca_vectors,risk_score,status").order("timestamp", { ascending: false }).limit(100);
  if (error) throw new Error("Unable to load monitored transactions.");
  return data;
});

export const analyzeTransaction = createServerFn({ method: "POST" }).inputValidator((input) => diagnosticSchema.parse(input)).handler(async ({ data }) => {
  const result = scoreFraudVector(data, data.threshold);
  const pcaVectors: Json = { Time: data.time, V14: data.v14, V4: data.v4, V12: data.v12, V10: data.v10 };
  const { data: transaction, error } = await createPublicClient().from("monitored_transactions").insert({ card_holder: "Manual Diagnostic", amount: data.amount, location: "FinShield Risk Lab", pca_vectors: pcaVectors, risk_score: result.riskScore, status: result.status }).select("id,timestamp,card_holder,amount,location,pca_vectors,risk_score,status").single();
  if (error) throw new Error("Unable to record the analyzed transaction.");
  return { ...result, transaction };
});

export const scoreTransactionBatch = createServerFn({ method: "POST" }).inputValidator((input) => batchSchema.parse(input)).handler(async ({ data }) => {
  const scored = data.rows.map((row) => ({ row, prediction: scoreFraudVector(row, row.threshold) })).sort((a, b) => b.prediction.riskScore - a.prediction.riskScore);
  const inserts = scored.map(({ row, prediction }) => ({ card_holder: row.cardHolder, amount: row.amount, location: row.location, pca_vectors: { Time: row.time, V14: row.v14, V4: row.v4, V12: row.v12, V10: row.v10 } as Json, risk_score: prediction.riskScore, status: prediction.status }));
  const { error } = await createPublicClient().from("monitored_transactions").insert(inserts);
  if (error) throw new Error("Unable to persist the scored batch.");
  return scored.map(({ row, prediction }) => ({ ...row, riskScore: prediction.riskScore, status: prediction.status }));
});
