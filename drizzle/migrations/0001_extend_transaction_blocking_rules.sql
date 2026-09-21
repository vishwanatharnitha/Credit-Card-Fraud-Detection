CREATE OR REPLACE FUNCTION public.enforce_transaction_blocking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount > 5000
    OR COALESCE((NEW.pca_vectors->>'V14')::numeric, 0) < -2.5
    OR COALESCE((NEW.pca_vectors->>'V4')::numeric, 0) > 2.0
    OR COALESCE((NEW.pca_vectors->>'V12')::numeric, 0) < -2.0 THEN
    NEW.status := 'Blocked';
    NEW.risk_score := GREATEST(NEW.risk_score, 96);
  END IF;
  RETURN NEW;
END;
$$;