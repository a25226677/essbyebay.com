-- Update all brand logo_url values with Simple Icons CDN URLs.
-- Simple Icons provides free, high-quality SVG brand icons: https://cdn.simpleicons.org/<slug>
-- The BrandCard component handles fallback cascading (SimpleIcons → Google Favicon → CSS initial)
-- so even if a slug doesn't exist in Simple Icons, the brand still displays correctly.

-- Tech & Electronics
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/3m'                WHERE slug = '3m';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/acer'              WHERE slug = 'acer';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/adidas'            WHERE slug = 'adidas';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/amd'               WHERE slug = 'amd';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/anker'             WHERE slug = 'anker';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/apple'             WHERE slug = 'apple';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/asus'              WHERE slug = 'asus';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/beatsbydre'        WHERE slug = 'beats';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/belkin'            WHERE slug = 'belkin';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/bosch'             WHERE slug = 'bosch';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/canon'             WHERE slug = 'canon';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/corsair'           WHERE slug = 'corsair';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/dell'              WHERE slug = 'dell';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/dewalt'            WHERE slug = 'dewalt';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/dyson'             WHERE slug = 'dyson';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/google'            WHERE slug = 'google';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/hp'                WHERE slug = 'hp';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/intel'             WHERE slug = 'intel';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/jbl'               WHERE slug = 'jbl';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/lenovo'            WHERE slug = 'lenovo';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/lg'                WHERE slug = 'lg';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/logitech'          WHERE slug = 'logitech';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/microsoft'         WHERE slug = 'microsoft';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/msi'               WHERE slug = 'msi';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/nokia'             WHERE slug = 'nokia';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/nvidia'            WHERE slug = 'nvidia';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/oneplus'           WHERE slug IN ('one-plus', 'oneplus');
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/otterbox'          WHERE slug = 'otterbox';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/samsung'           WHERE slug = 'samsung';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/sony'              WHERE slug = 'sony';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/spigen'            WHERE slug = 'spigen';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/xiaomi'            WHERE slug = 'xiaomi';

-- Sports & Fashion
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/calvinklein'       WHERE slug = 'calvin-klein';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/coach'             WHERE slug = 'coach';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/columbia'          WHERE slug = 'columbia';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/gucci'             WHERE slug = 'gucci';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/guess'             WHERE slug = 'guess';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/hm'               WHERE slug IN ('hm', 'h&m');
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/katespade'         WHERE slug = 'kate-spade';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/levis'             WHERE slug = 'levis';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/michaelkors'       WHERE slug = 'michael-kors';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/nike'              WHERE slug = 'nike';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/thenorthface'      WHERE slug = 'north-face';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/prada'             WHERE slug = 'prada';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/puma'              WHERE slug = 'puma';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/ralphlauren'       WHERE slug = 'ralph-lauren';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/reebok'            WHERE slug = 'reebok';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/tommyhilfiger'     WHERE slug = 'tommy-hilfiger';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/underarmour'       WHERE slug = 'under-armour';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/victoriassecret'   WHERE slug = 'victorias-secret';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/urbandecay'        WHERE slug = 'urban-decay';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/zara'              WHERE slug = 'zara';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/wilson'            WHERE slug = 'wilson';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/spalding'          WHERE slug = 'spalding';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/coleman'           WHERE slug = 'coleman';

-- Automotive
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/audi'              WHERE slug = 'audi';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/bmw'               WHERE slug = 'bmw';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/ford'              WHERE slug = 'ford';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/honda'             WHERE slug = 'honda';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/lamborghini'       WHERE slug = 'lamborghini';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/mercedesbenz'      WHERE slug IN ('mercedes-benz', 'mercedes');
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/rollsroyce'        WHERE slug = 'rolls-royce';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/royalenfield'      WHERE slug = 'royal-enfield';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/suzuki'            WHERE slug = 'suzuki';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/toyota'            WHERE slug = 'toyota';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/volvo'             WHERE slug = 'volvo';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/yamaha'            WHERE slug = 'yamaha';

-- Watches & Jewellery
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/breitling'         WHERE slug = 'breitling';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/casio'             WHERE slug = 'casio';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/fossil'            WHERE slug = 'fossil';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/omega'             WHERE slug = 'omega';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/rolex'             WHERE slug = 'rolex';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/seiko'             WHERE slug = 'seiko';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/tiffany'           WHERE slug = 'tiffany';

-- Beauty & Personal Care
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/clinique'          WHERE slug = 'clinique';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/esteelauder'       WHERE slug = 'estee-lauder';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/loreal'            WHERE slug = 'loreal';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/maccosmetics'      WHERE slug = 'mac';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/maybelline'        WHERE slug = 'maybelline';

-- Toys & Kids
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/fisherprice'       WHERE slug = 'fisher-price';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/giant'             WHERE slug = 'giant';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/hasbro'            WHERE slug = 'hasbro';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/hotwheels'         WHERE slug = 'hot-wheels';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/lego'              WHERE slug = 'lego';
UPDATE public.brands SET logo_url = 'https://cdn.simpleicons.org/mattel'            WHERE slug = 'mattel';

-- Catch-all: update any remaining brands that still have NULL or placeholder logo_url
-- Uses slug-based Simple Icons CDN URL
UPDATE public.brands
SET logo_url = 'https://cdn.simpleicons.org/' || replace(slug, '-', '')
WHERE logo_url IS NULL
   OR logo_url LIKE '%/images/placeholders/%';
