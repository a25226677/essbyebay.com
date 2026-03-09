-- Ensure new seller profiles start with the expected default credit score.
ALTER TABLE public.profiles
  ALTER COLUMN credit_score SET DEFAULT 100;

UPDATE public.profiles
SET credit_score = 100
WHERE role = 'seller' AND credit_score = 0;