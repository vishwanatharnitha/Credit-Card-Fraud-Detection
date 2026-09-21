CREATE TABLE public.monitored_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  card_holder text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  location text NOT NULL,
  pca_vectors jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_score numeric(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  status text NOT NULL CHECK (status IN ('Cleared', 'Flagged', 'Blocked'))
);

GRANT SELECT, INSERT, UPDATE ON public.monitored_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitored_transactions TO authenticated;
GRANT ALL ON public.monitored_transactions TO service_role;

ALTER TABLE public.monitored_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can monitor transactions"
ON public.monitored_transactions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public can submit evaluated transactions"
ON public.monitored_transactions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  risk_score >= 0 AND risk_score <= 100
  AND status IN ('Cleared', 'Flagged', 'Blocked')
);

CREATE POLICY "Public can update blocked transaction status"
ON public.monitored_transactions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (status = 'Blocked');

CREATE INDEX monitored_transactions_timestamp_idx
ON public.monitored_transactions ("timestamp" DESC);

CREATE INDEX monitored_transactions_status_idx
ON public.monitored_transactions (status);

CREATE OR REPLACE FUNCTION public.enforce_transaction_blocking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount > 5000 OR COALESCE((NEW.pca_vectors->>'V14')::numeric, 0) < -2.5 THEN
    NEW.status := 'Blocked';
    NEW.risk_score := GREATEST(NEW.risk_score, 96);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_transaction_blocking_before_write
BEFORE INSERT OR UPDATE ON public.monitored_transactions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_transaction_blocking();

ALTER PUBLICATION supabase_realtime ADD TABLE public.monitored_transactions;