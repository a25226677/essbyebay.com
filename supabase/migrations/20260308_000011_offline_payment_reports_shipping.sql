-- ============================================================
-- Migration 000011 — Offline Payment, Reports, Shipping,
--                    Website Setup, Setup & Configurations
-- ============================================================

-- 1. Manual payment methods (Bank, USDT-TRC20, etc.)
CREATE TABLE IF NOT EXISTS payment_methods (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  heading     TEXT NOT NULL,
  logo_url    TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Offline wallet recharge requests
CREATE TABLE IF NOT EXISTS offline_recharges (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operator_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
  method       TEXT NOT NULL DEFAULT 'Bank',
  txn_id       TEXT,
  photo_url    TEXT,
  is_approved  BOOLEAN DEFAULT FALSE,
  type         TEXT NOT NULL DEFAULT 'Balance Recharge',
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offline_recharges_user ON offline_recharges(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_recharges_approved ON offline_recharges(is_approved);

-- 3. Shipping countries list
CREATE TABLE IF NOT EXISTS shipping_countries (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_countries_code ON shipping_countries(code);

-- Insert 250 world countries
INSERT INTO shipping_countries (name, code, is_active) VALUES
('Afghanistan','AF',true),('Albania','AL',false),('Algeria','DZ',true),
('American Samoa','AS',true),('Andorra','AD',false),('Angola','AO',true),
('Anguilla','AI',false),('Antarctica','AQ',true),('Antigua And Barbuda','AG',false),
('Argentina','AR',true),('Armenia','AM',false),('Aruba','AW',true),
('Australia','AU',false),('Austria','AT',true),('Azerbaijan','AZ',false),
('Bahamas The','BS',true),('Bahrain','BH',false),('Bangladesh','BD',true),
('Barbados','BB',true),('Belarus','BY',false),('Belgium','BE',true),
('Belize','BZ',false),('Benin','BJ',true),('Bermuda','BM',true),
('Bhutan','BT',false),('Bolivia','BO',true),('Bosnia and Herzegovina','BA',false),
('Botswana','BW',true),('Bouvet Island','BV',false),('Brazil','BR',true),
('British Indian Ocean Territory','IO',false),('Brunei','BN',true),('Bulgaria','BG',false),
('Burkina Faso','BF',true),('Burundi','BI',false),('Cambodia','KH',true),
('Cameroon','CM',true),('Canada','CA',false),('Cape Verde','CV',true),
('Cayman Islands','KY',false),('Central African Republic','CF',true),('Chad','TD',false),
('Chile','CL',true),('China','CN',false),('Christmas Island','CX',true),
('Cocos (Keeling) Islands','CC',false),('Colombia','CO',true),('Comoros','KM',false),
('Congo','CG',true),('Cook Islands','CK',false),('Costa Rica','CR',true),
('Croatia','HR',false),('Cuba','CU',true),('Cyprus','CY',false),
('Czech Republic','CZ',true),('Denmark','DK',false),('Djibouti','DJ',true),
('Dominica','DM',false),('Dominican Republic','DO',true),('Ecuador','EC',false),
('Egypt','EG',true),('El Salvador','SV',false),('Equatorial Guinea','GQ',true),
('Eritrea','ER',false),('Estonia','EE',true),('Ethiopia','ET',false),
('Falkland Islands','FK',true),('Faroe Islands','FO',false),('Fiji Islands','FJ',true),
('Finland','FI',false),('France','FR',true),('French Guiana','GF',false),
('French Polynesia','PF',true),('Gabon','GA',false),('Gambia The','GM',true),
('Georgia','GE',false),('Germany','DE',true),('Ghana','GH',false),
('Gibraltar','GI',true),('Greece','GR',false),('Greenland','GL',true),
('Grenada','GD',false),('Guadeloupe','GP',true),('Guam','GU',false),
('Guatemala','GT',true),('Guernsey and Alderney','GG',false),('Guinea','GN',true),
('Guinea-Bissau','GW',false),('Guyana','GY',true),('Haiti','HT',false),
('Honduras','HN',true),('Hong Kong S.A.R.','HK',false),('Hungary','HU',true),
('Iceland','IS',false),('India','IN',true),('Indonesia','ID',false),
('Iran','IR',true),('Iraq','IQ',false),('Ireland','IE',true),
('Israel','IL',false),('Italy','IT',true),('Jamaica','JM',false),
('Japan','JP',true),('Jersey','JE',false),('Jordan','JO',true),
('Kazakhstan','KZ',false),('Kenya','KE',true),('Kiribati','KI',false),
('Korea North','KP',true),('Korea South','KR',false),('Kuwait','KW',true),
('Kyrgyzstan','KG',false),('Laos','LA',true),('Latvia','LV',false),
('Lebanon','LB',true),('Lesotho','LS',false),('Liberia','LR',true),
('Libya','LY',false),('Liechtenstein','LI',true),('Lithuania','LT',false),
('Luxembourg','LU',true),('Macau S.A.R.','MO',false),('Macedonia','MK',true),
('Madagascar','MG',false),('Malawi','MW',true),('Malaysia','MY',false),
('Maldives','MV',true),('Mali','ML',false),('Malta','MT',true),
('Man (Isle of)','IM',false),('Marshall Islands','MH',true),('Martinique','MQ',false),
('Mauritania','MR',true),('Mauritius','MU',false),('Mayotte','YT',true),
('Mexico','MX',false),('Micronesia','FM',true),('Moldova','MD',false),
('Monaco','MC',true),('Mongolia','MN',false),('Montenegro','ME',true),
('Montserrat','MS',false),('Morocco','MA',true),('Mozambique','MZ',false),
('Myanmar','MM',true),('Namibia','NA',false),('Nauru','NR',true),
('Nepal','NP',false),('Netherlands','NL',true),('New Caledonia','NC',false),
('New Zealand','NZ',true),('Nicaragua','NI',false),('Niger','NE',true),
('Nigeria','NG',false),('Niue','NU',true),('Norfolk Island','NF',false),
('Northern Mariana Islands','MP',true),('Norway','NO',false),('Oman','OM',true),
('Pakistan','PK',false),('Palau','PW',true),('Palestinian Territory Occupied','PS',false),
('Panama','PA',true),('Papua New Guinea','PG',false),('Paraguay','PY',true),
('Peru','PE',false),('Philippines','PH',true),('Pitcairn Island','PN',false),
('Poland','PL',true),('Portugal','PT',false),('Puerto Rico','PR',true),
('Qatar','QA',false),('Reunion','RE',true),('Romania','RO',false),
('Russia','RU',true),('Rwanda','RW',false),('Saint Helena','SH',true),
('Saint Kitts And Nevis','KN',false),('Saint Lucia','LC',true),('Saint Pierre and Miquelon','PM',false),
('Saint Vincent And The Grenadines','VC',true),('Samoa','WS',false),('San Marino','SM',true),
('Sao Tome and Principe','ST',false),('Saudi Arabia','SA',true),('Senegal','SN',false),
('Serbia','RS',true),('Seychelles','SC',false),('Sierra Leone','SL',true),
('Singapore','SG',false),('Slovakia','SK',true),('Slovenia','SI',false),
('Solomon Islands','SB',true),('Somalia','SO',false),('South Africa','ZA',true),
('Spain','ES',false),('Sri Lanka','LK',true),('Sudan','SD',false),
('Suriname','SR',true),('Svalbard And Jan Mayen Islands','SJ',false),('Swaziland','SZ',true),
('Sweden','SE',false),('Switzerland','CH',true),('Syria','SY',false),
('Taiwan','TW',true),('Tajikistan','TJ',false),('Tanzania','TZ',true),
('Thailand','TH',false),('Togo','TG',true),('Tokelau','TK',false),
('Tonga','TO',true),('Trinidad And Tobago','TT',false),('Tunisia','TN',true),
('Turkey','TR',false),('Turkmenistan','TM',true),('Turks And Caicos Islands','TC',false),
('Tuvalu','TV',true),('Uganda','UG',false),('Ukraine','UA',true),
('United Arab Emirates','AE',false),('United Kingdom','GB',true),('United States','US',false),
('Uruguay','UY',true),('Uzbekistan','UZ',false),('Vanuatu','VU',true),
('Vatican City State','VA',false),('Venezuela','VE',true),('Vietnam','VN',false),
('Virgin Islands (British)','VG',true),('Virgin Islands (US)','VI',false),('Wallis And Futuna Islands','WF',true),
('Western Sahara','EH',false),('Yemen','YE',true),('Zambia','ZM',false),('Zimbabwe','ZW',true)
ON CONFLICT (code) DO NOTHING;

-- 4. Shipping states
CREATE TABLE IF NOT EXISTS shipping_states (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id  UUID REFERENCES shipping_countries(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  state_code  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipping_states_country ON shipping_states(country_id);

-- 5. Shipping cities
CREATE TABLE IF NOT EXISTS shipping_cities (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_id      UUID REFERENCES shipping_states(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  shipping_cost NUMERIC(10,2) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shipping_cities_state ON shipping_cities(state_id);

-- 6. Shipping configuration
CREATE TABLE IF NOT EXISTS shipping_config (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key    TEXT UNIQUE NOT NULL,
  config_value  TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
INSERT INTO shipping_config (config_key, config_value) VALUES
  ('shipping_type','flat_rate'),
  ('flat_rate_cost','50'),
  ('free_shipping_min','500'),
  ('estimated_days','3-7'),
  ('shipping_carrier','Default')
ON CONFLICT (config_key) DO NOTHING;

-- 7. Website settings (key-value store)
CREATE TABLE IF NOT EXISTS website_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key   TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
INSERT INTO website_settings (setting_key, setting_value) VALUES
  ('site_logo',''),
  ('show_language_switcher','true'),
  ('show_currency_switcher','true'),
  ('sticky_header','true'),
  ('topbar_banner',''),
  ('topbar_banner_link','/'),
  ('help_line',''),
  ('header_nav','[{"label":"Home","href":"/"},{"label":"Flash Sale","href":"/flash-deals"},{"label":"Blogs","href":"/blog"},{"label":"All Brands","href":"/brands"}]'),
  ('footer_about',''),
  ('footer_social','{}'),
  ('footer_links','[]'),
  ('appearance_primary_color','#f97316'),
  ('appearance_font','Inter'),
  ('appearance_dark_mode','false'),
  ('general_site_name','StoreBay'),
  ('general_site_email','admin@storebay.com'),
  ('general_currency','USD'),
  ('general_timezone','UTC'),
  ('features_wishlist','true'),
  ('features_reviews','true'),
  ('features_affiliate','true'),
  ('features_wallet','true'),
  ('features_compare','true')
ON CONFLICT (setting_key) DO NOTHING;

-- 8. Club point system config
CREATE TABLE IF NOT EXISTS club_point_config (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key    TEXT UNIQUE NOT NULL,
  config_value  TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
INSERT INTO club_point_config (config_key, config_value) VALUES
  ('points_enabled','true'),
  ('points_per_purchase','10'),
  ('points_value','0.01'),
  ('min_redeem_points','100'),
  ('max_redeem_per_order','500'),
  ('expiry_days','365')
ON CONFLICT (config_key) DO NOTHING;

-- Points ledger
CREATE TABLE IF NOT EXISTS club_point_transactions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  points     INTEGER NOT NULL DEFAULT 0,
  type       TEXT NOT NULL DEFAULT 'earn',
  reference  TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_points_user ON club_point_transactions(user_id);

-- 9. Blog settings
CREATE TABLE IF NOT EXISTS blog_categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- blog_posts already exists from migration 000001; add missing columns
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS category_id   UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS views         INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published);

-- 10. Staffs
CREATE TABLE IF NOT EXISTS staffs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'staff',
  permissions   JSONB DEFAULT '{}'::jsonb,
  is_active     BOOLEAN DEFAULT TRUE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_staffs_email ON staffs(email);

-- 11. Uploaded files registry
CREATE TABLE IF NOT EXISTS uploaded_files (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name     TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_size     BIGINT DEFAULT 0,
  mime_type     TEXT DEFAULT 'image/jpeg',
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_by ON uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_created ON uploaded_files(created_at DESC);

-- 12. User searches log (for reports)
CREATE TABLE IF NOT EXISTS user_searches (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_term  TEXT NOT NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  results_count INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_searches_term ON user_searches(search_term);
CREATE INDEX IF NOT EXISTS idx_user_searches_created ON user_searches(created_at DESC);

-- 13. Commission history
CREATE TABLE IF NOT EXISTS commission_history (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id      UUID,
  product_id    UUID,
  commission    NUMERIC(12,2) DEFAULT 0,
  commission_pct NUMERIC(5,2) DEFAULT 0,
  type          TEXT DEFAULT 'sale',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commission_seller ON commission_history(seller_id);
CREATE INDEX IF NOT EXISTS idx_commission_created ON commission_history(created_at DESC);
