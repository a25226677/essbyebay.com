-- Randomize product prices between $20 and $2000.
-- compare_at_price is set 15–50% above the sale price to simulate realistic discounts.
-- Run once in the Supabase SQL editor.

UPDATE public.products
SET
  price             = ROUND((random() * (2000 - 20) + 20)::numeric, 2),
  compare_at_price  = ROUND(
                        (random() * (2000 - 20) + 20)::numeric
                        * (1 + (random() * 0.35 + 0.15)),   -- 15 – 50 % markup
                        2
                      );
