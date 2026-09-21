import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  Bell,
  ChevronRight,
  CircleDollarSign,
  Fingerprint,
  Gauge,
  Globe2,
  Radio,
  ScanLine,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ParticleField } from "@/components/fraud/particle-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { analyzeTransaction, listTransactions } from "@/lib/transactions.functions";
import { cn } from "@/lib/utils";

const transactionsQuery = queryOptions({
  queryKey: ["monitored-transactions"],
  queryFn: () => listTransactions(),
  staleTime: 15_000,
});

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(transactionsQuery),
  head: () => ({
    meta: [
      { title: "Aegis Vector | Fraud Detection Command Center" },
      { name: "description", content: "Monitor live card transactions, inspect PCA anomaly signals, and block high-risk payments in real time." },
      { property: "og:title", content: "Aegis Vector | Fraud Detection Command Center" },
      { property: "og:description", content: "Real-time card fraud monitoring and PCA anomaly analysis for security teams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FraudCommandCenter,
});

type Transaction = Awaited<ReturnType<typeof listTransactions>>[number];
type SandboxValues = { amount: number; time: number; v14: number; v4: number; v12: number; v10: number };

const initialVector: SandboxValues = { amount: 1850, time: 42800, v14: -1.2, v4: 1.7, v12: -0.8, v10: -0.5 };

function money(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value));
}

function riskTone(score: number) {
  if (score >= 80) return "text-destructive";
  if (score >= 50) return "text-primary";
  return "text-emerald-400";
}

function statusStyle(status: string) {
  if (status === "Blocked") return "border-destructive/35 bg-destructive/10 text-destructive";
  if (status === "Flagged") return "border-primary/35 bg-primary/10 text-primary";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-400";
}

function FraudCommandCenter() {
  const { data: transactions } = useSuspenseQuery(transactionsQuery);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const channel = supabase
      .channel("monitored-transactions-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "monitored_transactions" }, () => {
        void queryClient.invalidateQueries({ queryKey: transactionsQuery.queryKey });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  const blocked = transactions.filter((transaction) => transaction.status === "Blocked").length;
  const flagged = transactions.filter((transaction) => transaction.status === "Flagged").length;
  const volume = transactions.reduce((total, transaction) => total + Number(transaction.amount), 0);
  const threat = transactions.length ? Math.round(transactions.reduce((sum, transaction) => sum + Number(transaction.risk_score), 0) / transactions.length) : 0;

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ParticleField />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent_45%),linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_72%,transparent),var(--background))]" />
      <div className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6 lg:px-8">
        <Header />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5">
          <TabsList className="grid h-auto w-full grid-cols-3 border border-border/70 bg-card/60 p-1 backdrop-blur-xl lg:w-[620px]">
            <TabsTrigger value="overview" className="gap-2 py-2.5 font-mono text-[10px] uppercase tracking-normal sm:text-xs"><Activity /> Overview Hub</TabsTrigger>
            <TabsTrigger value="stream" className="gap-2 py-2.5 font-mono text-[10px] uppercase tracking-normal sm:text-xs"><Radio /> Live Stream</TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-2 py-2.5 font-mono text-[10px] uppercase tracking-normal sm:text-xs"><ScanLine /> Risk Sandbox</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 animate-fade-in">
            <Overview transactions={transactions} volume={volume} blocked={blocked} flagged={flagged} threat={threat} onOpenStream={() => setActiveTab("stream")} />
          </TabsContent>
          <TabsContent value="stream" className="mt-5 animate-fade-in">
            <TransactionStream transactions={transactions} />
          </TabsContent>
          <TabsContent value="sandbox" className="mt-5 animate-fade-in">
            <RiskSandbox />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="glass-panel relative flex min-h-20 items-center justify-between overflow-hidden rounded-md px-4 py-4 sm:px-6">
      <div className="absolute bottom-0 left-0 h-px w-1/3 gold-rule animate-scanline" />
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center border border-primary/35 bg-primary/10 text-primary"><Fingerprint className="size-5" /></div>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-lg font-semibold sm:text-xl">AEGIS VECTOR</h1><Badge variant="outline" className="border-primary/25 font-mono text-[9px] text-primary">PCA ENGINE</Badge></div>
          <p className="font-mono text-[10px] uppercase text-muted-foreground">Transaction anomaly command center</p>
        </div>
      </div>
      <div className="hidden items-center gap-5 md:flex">
        <div className="text-right"><p className="font-mono text-[10px] uppercase text-muted-foreground">System integrity</p><p className="mt-1 flex items-center gap-2 text-xs text-emerald-400"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> All nodes operational</p></div>
        <Button variant="terminal" size="icon" aria-label="Security alerts"><Bell /></Button>
      </div>
    </header>
  );
}

function Overview({ transactions, volume, blocked, flagged, threat, onOpenStream }: { transactions: Transaction[]; volume: number; blocked: number; flagged: number; threat: number; onOpenStream: () => void }) {
  const chartData = useMemo(() => [...transactions].reverse().map((transaction) => ({ time: timeLabel(transaction.timestamp), volume: Number(transaction.amount), risk: Number(transaction.risk_score) })), [transactions]);
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <Metric icon={<CircleDollarSign />} label="Total monitored volume" value={money(volume)} detail={`${transactions.length} vectors analyzed`} trend="+12.4%" />
        <div className="glass-panel relative min-h-44 overflow-hidden rounded-md p-5">
          <div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase text-muted-foreground">Active threat level</p><p className={cn("mt-2 text-2xl font-semibold", threat >= 60 ? "text-destructive" : "text-primary")}>{threat >= 60 ? "ELEVATED" : "GUARDED"}</p></div><Gauge className="size-5 text-primary" /></div>
          <div className="mt-3 flex items-end justify-between">
            <svg viewBox="0 0 100 55" className="h-20 w-40" aria-label={`Threat level ${threat} percent`}><path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--muted)" strokeWidth="8" strokeLinecap="round" /><path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinecap="round" pathLength="100" strokeDasharray={`${threat} 100`} className="animate-gauge" /></svg>
            <div className="pb-2 text-right"><p className="font-mono text-3xl text-primary">{threat}</p><p className="font-mono text-[9px] text-muted-foreground">RISK INDEX</p></div>
          </div>
        </div>
        <Metric icon={<Ban />} label="Blocked fraud cases" value={String(blocked)} detail={`${flagged} under review`} trend="LIVE" danger />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.65fr)]">
        <div className="glass-panel rounded-md p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase text-primary">Network throughput</p><h2 className="mt-1 text-lg font-semibold">Transaction volume / time</h2></div><Badge variant="outline" className="border-emerald-400/25 text-emerald-400"><Radio className="mr-1 size-3 animate-pulse" /> Live</Badge></div>
          <ClientOnly fallback={<div className="h-72 animate-pulse bg-muted/30" />}>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
                <defs><linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.42} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" />
                <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "4px" }} formatter={(value) => [money(Number(value)), "Volume"]} />
                <Area type="monotone" dataKey="volume" stroke="var(--primary)" strokeWidth={3} fill="url(#goldArea)" dot={{ r: 2, fill: "var(--primary)" }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </AreaChart>
              </ResponsiveContainer>
            </div>
          </ClientOnly>
        </div>
        <div className="glass-panel rounded-md p-5">
          <div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase text-primary">Latest signals</p><h2 className="mt-1 text-lg font-semibold">Threat dispatch</h2></div><ShieldCheck className="text-emerald-400" /></div>
          <div className="mt-5 space-y-1">
            {transactions.slice(0, 5).map((transaction) => <Signal key={transaction.id} transaction={transaction} />)}
          </div>
          <Button variant="terminal" className="mt-4 w-full justify-between" onClick={onOpenStream}>Inspect full stream <ChevronRight /></Button>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, detail, trend, danger = false }: { icon: React.ReactNode; label: string; value: string; detail: string; trend: string; danger?: boolean }) {
  return <div className={cn("glass-panel relative min-h-44 overflow-hidden rounded-md p-5", danger && "border-destructive/25")}><div className="flex items-start justify-between"><div className={cn("grid size-9 place-items-center border bg-primary/10 text-primary", danger && "border-destructive/25 bg-destructive/10 text-destructive")}>{icon}</div><span className={cn("flex items-center gap-1 font-mono text-[10px] text-emerald-400", danger && "text-destructive")}>{danger ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{trend}</span></div><p className="mt-5 font-mono text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold">{value}</p><p className="mt-2 font-mono text-[10px] text-muted-foreground">{detail}</p></div>;
}

function Signal({ transaction }: { transaction: Transaction }) {
  const score = Number(transaction.risk_score);
  return <div className="flex items-center gap-3 border-b border-border/50 py-3 last:border-0"><span className={cn("size-2 rounded-full", transaction.status === "Blocked" ? "bg-destructive shadow-[0_0_12px_var(--destructive)]" : transaction.status === "Flagged" ? "bg-primary" : "bg-emerald-400")} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{transaction.card_holder}</p><p className="font-mono text-[9px] text-muted-foreground">{transaction.location} · {timeLabel(transaction.timestamp)}</p></div><span className={cn("font-mono text-xs", riskTone(score))}>{score}%</span></div>;
}

function TransactionStream({ transactions }: { transactions: Transaction[] }) {
  return <section className="glass-panel overflow-hidden rounded-md"><div className="flex flex-col gap-3 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase text-primary">Realtime ledger</p><h2 className="mt-1 text-xl font-semibold">Monitored transaction stream</h2></div><div className="flex items-center gap-2 font-mono text-[10px] text-emerald-400"><span className="size-2 animate-pulse rounded-full bg-emerald-400" /> ENCRYPTED CHANNEL ACTIVE</div></div><Table><TableHeader><TableRow className="border-border/70 hover:bg-transparent"><TableHead className="pl-5 font-mono text-[10px] uppercase">Timestamp</TableHead><TableHead className="font-mono text-[10px] uppercase">Card holder</TableHead><TableHead className="font-mono text-[10px] uppercase">Location</TableHead><TableHead className="font-mono text-[10px] uppercase">Amount</TableHead><TableHead className="font-mono text-[10px] uppercase">Risk score</TableHead><TableHead className="pr-5 text-right font-mono text-[10px] uppercase">Status</TableHead></TableRow></TableHeader><TableBody>{transactions.map((transaction) => { const score = Number(transaction.risk_score); return <TableRow key={transaction.id} className="border-border/40 hover:bg-accent/30"><TableCell className="pl-5 font-mono text-xs text-muted-foreground">{timeLabel(transaction.timestamp)}</TableCell><TableCell className="min-w-36 font-medium">{transaction.card_holder}</TableCell><TableCell className="min-w-40 text-muted-foreground"><span className="flex items-center gap-2"><Globe2 className="size-3 text-primary" />{transaction.location}</span></TableCell><TableCell className="font-mono">{money(transaction.amount)}</TableCell><TableCell><div className="flex min-w-28 items-center gap-3"><div className="h-1 flex-1 overflow-hidden bg-muted"><div className={cn("h-full", score >= 80 ? "bg-destructive" : score >= 50 ? "bg-primary" : "bg-emerald-400")} style={{ width: `${score}%` }} /></div><span className={cn("w-9 font-mono text-xs", riskTone(score))}>{score}%</span></div></TableCell><TableCell className="pr-5 text-right"><Badge variant="outline" className={cn("font-mono text-[9px] uppercase", statusStyle(transaction.status))}>{transaction.status}</Badge></TableCell></TableRow>; })}</TableBody></Table></section>;
}

function RiskSandbox() {
  const analyze = useServerFn(analyzeTransaction);
  const queryClient = useQueryClient();
  const [values, setValues] = useState(initialVector);
  const [result, setResult] = useState<{ riskScore: number; status: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const update = (key: keyof SandboxValues, value: number) => setValues((current) => ({ ...current, [key]: value }));
  const run = async () => {
    setWorking(true);
    try {
      const response = await analyze({ data: values });
      setResult(response);
      setOpen(true);
      await queryClient.invalidateQueries({ queryKey: transactionsQuery.queryKey });
    } finally { setWorking(false); }
  };

  return <><section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]"><div className="glass-panel rounded-md p-5 sm:p-7"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase text-primary">Controlled evaluation</p><h2 className="mt-1 text-2xl font-semibold">PCA Risk Sandbox</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Tune extracted vector components and execute the active transaction policy.</p></div><Sparkles className="text-primary" /></div><div className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2">{([
    ["amount", "Amount", 0, 10000, 50, "$"], ["time", "Time", 0, 172800, 100, "s"], ["v14", "V14", -10, 5, 0.1, ""], ["v4", "V4", -5, 10, 0.1, ""], ["v12", "V12", -10, 5, 0.1, ""], ["v10", "V10", -10, 5, 0.1, ""],
  ] as const).map(([key, label, min, max, step, unit]) => <VectorControl key={key} name={label} unit={unit} value={values[key]} min={min} max={max} step={step} onChange={(value) => update(key, value)} />)}</div><Button variant="command" size="lg" className="mt-9 w-full sm:w-auto" onClick={run} disabled={working}>{working ? <Activity className="animate-spin" /> : <ScanLine />}{working ? "Analyzing vector…" : "Analyze Vector"}</Button></div><aside className="glass-panel rounded-md p-5 sm:p-7"><p className="font-mono text-[10px] uppercase text-primary">Active policy</p><h3 className="mt-1 text-lg font-semibold">Block thresholds</h3><div className="mt-6 space-y-3"><PolicyRule active={values.amount > 5000} label="Amount exceeds $5,000" value={money(values.amount)} /><PolicyRule active={values.v14 < -2.5} label="V14 drops below -2.5" value={values.v14.toFixed(2)} /></div><div className="mt-7 border-t border-border/70 pt-6"><p className="font-mono text-[10px] uppercase text-muted-foreground">Vector signature</p><div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[10px] text-muted-foreground">{Object.entries(values).map(([key, value]) => <div key={key} className="border border-border/60 bg-background/40 px-3 py-2"><span className="uppercase text-primary">{key}</span><span className="float-right">{value}</span></div>)}</div></div></aside></section><ResultDialog result={result} open={open} onOpenChange={setOpen} /></>;
}

function VectorControl({ name, unit, value, min, max, step, onChange }: { name: string; unit: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <div><div className="mb-3 flex items-center justify-between"><label htmlFor={`vector-${name}`} className="font-mono text-xs text-foreground">{name}</label><div className="flex w-28 items-center"><span className="mr-1 font-mono text-xs text-primary">{unit}</span><Input id={`vector-${name}`} type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} className="h-8 border-border bg-background/50 text-right font-mono text-xs" /></div></div><Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(next[0] ?? value)} aria-label={name} /></div>;
}

function PolicyRule({ active, label, value }: { active: boolean; label: string; value: string }) {
  return <div className={cn("flex items-center justify-between border p-4 transition-colors", active ? "border-destructive/50 bg-destructive/10" : "border-border/60 bg-background/30")}><div className="flex items-center gap-3">{active ? <ShieldX className="size-4 text-destructive" /> : <ShieldCheck className="size-4 text-emerald-400" />}<span className="text-xs">{label}</span></div><span className={cn("font-mono text-xs", active ? "text-destructive" : "text-muted-foreground")}>{value}</span></div>;
}

function ResultDialog({ result, open, onOpenChange }: { result: { riskScore: number; status: string } | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const blocked = result?.status === "Blocked";
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={cn("overflow-hidden border-primary/35 bg-popover sm:max-w-md", blocked && "border-destructive/55 crimson-glow")}><div className={cn("absolute inset-x-0 top-0 h-1 bg-primary", blocked && "bg-destructive animate-alert-pulse")} /><DialogHeader className="items-center text-center"><div className={cn("mb-3 grid size-16 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary", blocked && "border-destructive/50 bg-destructive/10 text-destructive")}>{blocked ? <ShieldX className="size-8" /> : <ShieldCheck className="size-8" />}</div><DialogTitle className={cn("text-2xl", blocked && "text-destructive")}>{blocked ? "Transaction Blocked" : result?.status === "Flagged" ? "Manual Review Required" : "Transaction Cleared"}</DialogTitle><DialogDescription>{blocked ? "The active policy intercepted this payment before authorization." : "The vector has been recorded in the monitored transaction stream."}</DialogDescription></DialogHeader><div className="my-2 border-y border-border/70 py-5 text-center"><p className="font-mono text-[10px] uppercase text-muted-foreground">Calculated fraud risk</p><p className={cn("mt-2 font-mono text-5xl text-primary", blocked && "text-destructive")}>{result?.riskScore ?? 0}<span className="text-xl">%</span></p></div><DialogFooter><Button variant={blocked ? "destructive" : "command"} className="w-full" onClick={() => onOpenChange(false)}>{blocked ? <AlertTriangle /> : <ShieldCheck />} Acknowledge decision</Button></DialogFooter></DialogContent></Dialog>;
}