CREATE TABLE IF NOT EXISTS store_settings (
  id integer PRIMARY KEY DEFAULT 1,
  shipping_fee numeric DEFAULT 50,
  free_shipping_threshold numeric DEFAULT 0,
  currency_ar text DEFAULT 'ج.م',
  currency_en text DEFAULT 'EGP',
  announcement_ar text,
  announcement_en text,
  whatsapp_number text DEFAULT '201000000000',
  instagram_url text DEFAULT '',
  facebook_url text DEFAULT '',
  tiktok_url text DEFAULT '',
  logo_ar_url text DEFAULT '',
  logo_en_url text DEFAULT '',
  hero_badge_ar text DEFAULT 'MADAR PERFUMES',
  hero_badge_en text DEFAULT 'MADAR PERFUMES',
  hero_title_ar text DEFAULT 'كل عطر وليه جاذبيته.',
  hero_title_en text DEFAULT 'Every Scent Has Its Gravity.',
  hero_subtitle_ar text DEFAULT 'كل Scent وليه جاذبيته.',
  hero_subtitle_en text DEFAULT 'YOUR SCENT. YOUR GRAVITY.',
  show_iconic_section boolean DEFAULT true,
  show_coupons_section boolean DEFAULT true,
  show_quiz_section boolean DEFAULT true,
  quiz_questions jsonb DEFAULT '[]'::jsonb,
  admin_pin text DEFAULT '2026',
  admin_pin_hash text DEFAULT ''
);

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS admin_pin_hash text DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp_number text DEFAULT '201000000000';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS instagram_url text DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS tiktok_url text DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS logo_ar_url text DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS logo_en_url text DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_ar text DEFAULT 'MADAR PERFUMES';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_badge_en text DEFAULT 'MADAR PERFUMES';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_title_ar text DEFAULT 'كل عطر وليه جاذبيته.';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_title_en text DEFAULT 'Every Scent Has Its Gravity.';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_subtitle_ar text DEFAULT 'كل Scent وليه جاذبيته.';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hero_subtitle_en text DEFAULT 'YOUR SCENT. YOUR GRAVITY.';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_iconic_section boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_coupons_section boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS show_quiz_section boolean DEFAULT true;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS quiz_questions jsonb DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS quiz_questions (
  id text PRIMARY KEY DEFAULT 'default',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY,
  slug text UNIQUE,
  name_ar text,
  name_en text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  name_ar text,
  name_en text,
  subtitle_ar text,
  subtitle_en text,
  description_ar text,
  description_en text,
  image_url text,
  gallery_images jsonb DEFAULT '[]'::jsonb,
  is_top_seller boolean DEFAULT false,
  concentration text DEFAULT 'Extrait de Parfum',
  gender text,
  season text,
  time_of_day text,
  scent_vibe text,
  longevity integer DEFAULT 90,
  sillage integer DEFAULT 85,
  longevity_label_ar text,
  longevity_label_en text,
  longevity_percent integer DEFAULT 80,
  sillage_percent integer DEFAULT 85,
  top_notes_ar text[],
  top_notes_en text[],
  heart_notes_ar text[],
  heart_notes_en text[],
  base_notes_ar text[],
  base_notes_en text[],
  sizes jsonb,
  featured boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_top_seller boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS longevity_label_ar text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS longevity_label_en text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS longevity_percent integer DEFAULT 80;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sillage_percent integer DEFAULT 85;

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY,
  code text UNIQUE,
  title_ar text,
  title_en text,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric,
  min_order_amount numeric DEFAULT 0,
  show_on_home boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  alt_phone text DEFAULT '',
  governorate text DEFAULT 'القاهرة',
  city text DEFAULT '',
  address_details text DEFAULT '',
  notes text DEFAULT '',
  wishlist jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  order_number text UNIQUE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  customer_alt_phone text,
  governorate text,
  city text,
  address_details text,
  notes text,
  items jsonb,
  subtotal numeric,
  coupon_code text,
  discount_amount numeric DEFAULT 0,
  shipping_fee numeric DEFAULT 50,
  total numeric,
  payment_method text DEFAULT 'COD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public store read access" ON products;
DROP POLICY IF EXISTS "Public category read access" ON categories;
DROP POLICY IF EXISTS "Public coupon read access" ON coupons;
DROP POLICY IF EXISTS "Public settings read access" ON store_settings;
DROP POLICY IF EXISTS "Public quiz read access" ON quiz_questions;
DROP POLICY IF EXISTS "Allow all admin access" ON quiz_questions;
DROP POLICY IF EXISTS "Public order insert access" ON orders;
DROP POLICY IF EXISTS "Allow all admin access" ON categories;
DROP POLICY IF EXISTS "Allow all admin access" ON products;
DROP POLICY IF EXISTS "Allow all admin access" ON coupons;
DROP POLICY IF EXISTS "Allow all admin access" ON store_settings;
DROP POLICY IF EXISTS "Allow all admin access" ON orders;
DROP POLICY IF EXISTS "Public customer read access" ON public.customers;
DROP POLICY IF EXISTS "Public customer insert access" ON public.customers;
DROP POLICY IF EXISTS "Public customer update access" ON public.customers;

CREATE POLICY "Public store read access" ON products
  FOR SELECT USING (true);
CREATE POLICY "Public category read access" ON categories
  FOR SELECT USING (true);
CREATE POLICY "Public coupon read access" ON coupons
  FOR SELECT USING (true);
CREATE POLICY "Public settings read access" ON store_settings
  FOR SELECT USING (true);
CREATE POLICY "Public quiz read access" ON quiz_questions
  FOR SELECT USING (true);
CREATE POLICY "Public order insert access" ON orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public customer read access" ON public.customers
  FOR SELECT USING (true);
CREATE POLICY "Public customer insert access" ON public.customers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public customer update access" ON public.customers
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admin access" ON categories
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admin access" ON products
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admin access" ON coupons
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admin access" ON store_settings
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admin access" ON quiz_questions
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all admin access" ON orders
  FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON public.customers TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

INSERT INTO public.customers (
  id, phone, password_hash, full_name, alt_phone, governorate, city,
  address_details, notes, wishlist
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '01012345678',
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  'أحمد محمود', '', 'الإسكندرية', 'سيدي بشر',
  'شارع جمال عبد الناصر، برج المدار، الدور الخامس', '', '[]'::jsonb
)
ON CONFLICT (phone) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  alt_phone = EXCLUDED.alt_phone,
  governorate = EXCLUDED.governorate,
  city = EXCLUDED.city,
  address_details = EXCLUDED.address_details,
  notes = EXCLUDED.notes,
  wishlist = EXCLUDED.wishlist;

INSERT INTO public.orders (
  id, order_number, customer_id, customer_name, customer_phone, customer_alt_phone,
  governorate, city, address_details, notes, items, subtotal, coupon_code,
  discount_amount, shipping_fee, total, payment_method, status, created_at
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'MDR-8492',
  '550e8400-e29b-41d4-a716-446655440000',
  'أحمد محمود', '01012345678', '', 'الإسكندرية', 'سيدي بشر',
  'شارع جمال عبد الناصر، برج المدار، الدور الخامس', '',
  '[{"product_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","name":"MADAR Cosmic Oud","name_ar":"مدار كوزميك عود","size":"50ml","quantity":1,"price":850}]'::jsonb,
  850, '', 0, 50, 900, 'COD', 'confirmed', '2026-11-01T10:00:00Z'
)
ON CONFLICT (order_number) DO UPDATE SET
  customer_id = EXCLUDED.customer_id,
  customer_name = EXCLUDED.customer_name,
  customer_phone = EXCLUDED.customer_phone,
  customer_alt_phone = EXCLUDED.customer_alt_phone,
  governorate = EXCLUDED.governorate,
  city = EXCLUDED.city,
  address_details = EXCLUDED.address_details,
  notes = EXCLUDED.notes,
  items = EXCLUDED.items,
  subtotal = EXCLUDED.subtotal,
  coupon_code = EXCLUDED.coupon_code,
  discount_amount = EXCLUDED.discount_amount,
  shipping_fee = EXCLUDED.shipping_fee,
  total = EXCLUDED.total,
  payment_method = EXCLUDED.payment_method,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at;

INSERT INTO store_settings (
  id, shipping_fee, currency_ar, currency_en, announcement_ar, announcement_en,
  whatsapp_number, instagram_url, facebook_url, tiktok_url,
  hero_badge_ar, hero_badge_en, hero_title_ar, hero_title_en,
  hero_subtitle_ar, hero_subtitle_en,
  show_iconic_section, show_coupons_section, show_quiz_section, admin_pin
)
VALUES (
  1, 50, 'ج.م', 'EGP',
  'شحن ثابت 50 ج.م لجميع المحافظات • الدفع عند الاستلام',
  'Flat 50 EGP Shipping Nationwide • Cash on Delivery',
  '201000000000', '', '', '',
  'MADAR PERFUMES',
  'MADAR PERFUMES',
  'كل عطر وليه جاذبيته.',
  'Every Scent Has Its Gravity.',
  'كل Scent وليه جاذبيته.',
  'YOUR SCENT. YOUR GRAVITY.',
  true, true, true, '2026'
)
ON CONFLICT (id) DO UPDATE SET
  shipping_fee = EXCLUDED.shipping_fee,
  currency_ar = EXCLUDED.currency_ar,
  currency_en = EXCLUDED.currency_en,
  announcement_ar = EXCLUDED.announcement_ar,
  announcement_en = EXCLUDED.announcement_en,
  whatsapp_number = EXCLUDED.whatsapp_number,
  instagram_url = EXCLUDED.instagram_url,
  facebook_url = EXCLUDED.facebook_url,
  tiktok_url = EXCLUDED.tiktok_url,
  hero_badge_ar = EXCLUDED.hero_badge_ar,
  hero_badge_en = EXCLUDED.hero_badge_en,
  hero_title_ar = EXCLUDED.hero_title_ar,
  hero_title_en = EXCLUDED.hero_title_en,
  hero_subtitle_ar = EXCLUDED.hero_subtitle_ar,
  hero_subtitle_en = EXCLUDED.hero_subtitle_en,
  show_iconic_section = EXCLUDED.show_iconic_section,
  show_coupons_section = EXCLUDED.show_coupons_section,
  show_quiz_section = EXCLUDED.show_quiz_section,
  admin_pin = EXCLUDED.admin_pin;

INSERT INTO categories (id, slug, name_ar, name_en, sort_order)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'oud-oriental', 'عود وشرقي فخم', 'Oud & Oriental', 4),
  ('22222222-2222-4222-8222-222222222222', 'men', 'عطور رجالية', 'For Men', 1),
  ('33333333-3333-4333-8333-333333333333', 'women', 'عطور نسائية', 'For Women', 2),
  ('44444444-4444-4444-8444-444444444444', 'unisex', 'للجنسين (Unisex)', 'Unisex', 3),
  ('55555555-5555-4555-8555-555555555555', 'all', 'الكل', 'All', 0)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  sort_order = EXCLUDED.sort_order;

INSERT INTO products (
  id, category_id, name_ar, name_en, subtitle_ar, subtitle_en, description_ar, description_en,
  image_url, gallery_images, is_top_seller, concentration, gender, season, time_of_day, scent_vibe,
  longevity, longevity_label_ar, longevity_label_en, longevity_percent, sillage, sillage_percent,
  top_notes_ar, top_notes_en, heart_notes_ar, heart_notes_en, base_notes_ar, base_notes_en,
  sizes, featured, active
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'مدار كوزميك عود', 'MADAR Cosmic Oud',
    'فخامة العود الملكي مع الزعفران والعنبر الدافئ', 'Royal oud with saffron and warm amber',
    'عطر شرقي فخم يجمع بين دفء العود المعتق ونعومة الفانيليا والزعفران. مثالي للسهرات والأجواء المسائية ويتميز بثبات قوي جداً.',
    'A luxurious oriental fragrance blending aged oud with smooth vanilla and saffron. Ideal for evenings, with exceptional longevity.',
    'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80',
    '[]'::jsonb, true, 'Extrait de Parfum', 'Unisex', 'Winter', 'Night', 'Rich & warm',
    12, '12 ساعة', '12h', 96, 90, 90,
    ARRAY['زعفران', 'برغموت', 'هيل'], ARRAY['Saffron', 'Bergamot', 'Cardamom'],
    ARRAY['ورد دمشقي', 'خشب الأرز', 'باتشولي'], ARRAY['Damask Rose', 'Cedarwood', 'Patchouli'],
    ARRAY['عود ملكي', 'عنبر دافئ', 'فانيليا مدغشقر'], ARRAY['Royal Oud', 'Warm Amber', 'Madagascar Vanilla'],
    '[{"size":"50ml","price":850,"compare_price":1000,"in_stock":true},{"size":"100ml","price":1450,"compare_price":1700,"in_stock":true}]',
    true, true
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '44444444-4444-4444-8444-444444444444',
    'مدار فيلفيت نايت', 'MADAR Velvet Night',
    'مزيج ساحر من القرفة، الفانيليا، وأخشاب الصندل (مستوحى من أجواء Angels'' Share)',
    'A captivating blend of cinnamon, vanilla, and sandalwood',
    'عطر دافئ وجذاب يمزج بين القرفة الحلوة وحبوب التونكا مع لمسة فاخرة من الفانيليا وخشب الصندل. يمنحك هالة جذابة تلفت الأنظار.',
    'A warm, captivating scent of sweet cinnamon and tonka bean, finished with luxurious vanilla and sandalwood.',
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=80',
    '[]'::jsonb, false, 'Extrait de Parfum', 'Unisex', 'Autumn', 'Evening', 'Warm & inviting',
    11, '11 ساعة', '11h', 88, 88, 88,
    ARRAY['قرفة دافئة', 'برغموت'], ARRAY['Warm Cinnamon', 'Bergamot'],
    ARRAY['حبوب التونكا', 'برالين', 'زهور السوسن'], ARRAY['Tonka Bean', 'Praline', 'Iris'],
    ARRAY['فانيليا', 'خشب الصندل', 'عنبر'], ARRAY['Vanilla', 'Sandalwood', 'Amber'],
    '[{"size":"50ml","price":930,"compare_price":1100,"in_stock":true},{"size":"100ml","price":1550,"compare_price":1800,"in_stock":true}]',
    false, true
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '44444444-4444-4444-8444-444444444444',
    'مدار سولار بريز', 'MADAR Solar Breeze',
    'انتعاش الحمضيات والبرغموت مع المسك الأبيض', 'Bright citrus and bergamot over white musk',
    'عطر صباحي منعش ونقي يمنحك إحساساً بالحيوية والنظافة طوال اليوم، بفضل مزيج الليمون الإيطالي والبرغموت مع قاعدة ناعمة من المسك والأخشاب.',
    'A fresh, clean daytime fragrance of Italian lemon and bergamot, softened by musk and woods.',
    'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=80',
    '[]'::jsonb, false, 'Extrait de Parfum', 'Unisex', 'Spring', 'Daytime', 'Fresh & bright',
    9, '9 ساعات', '9h', 76, 80, 80,
    ARRAY['برغموت إيطالي', 'ماندرين', 'نعناع'], ARRAY['Italian Bergamot', 'Mandarin', 'Mint'],
    ARRAY['لافندر', 'زهر البرتقال', 'ياسمين'], ARRAY['Lavender', 'Orange Blossom', 'Jasmine'],
    ARRAY['مسك أبيض', 'أمبروكسان', 'خشب الأرز'], ARRAY['White Musk', 'Ambroxan', 'Cedarwood'],
    '[{"size":"50ml","price":780,"compare_price":950,"in_stock":true},{"size":"100ml","price":1350,"compare_price":1600,"in_stock":true}]',
    false, true
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '33333333-3333-4333-8333-333333333333',
    'مدار روز إكليبس', 'MADAR Rose Eclipse',
    'نعومة الورد البلغاري مع التوت الأحمر والفانيليا', 'Bulgarian rose, red berries, and vanilla',
    'عطر أنثوي راقٍ يجمع بين جاذبية التوت الأحمر ونعومة الورد مع قاعدة كريمية من الفانيليا والمسك تدوم طويلاً.',
    'An elegant feminine fragrance pairing red berries and soft rose with a lasting, creamy vanilla and musk base.',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80',
    '[]'::jsonb, false, 'Extrait de Parfum', 'Women', 'Spring', 'Evening', 'Soft & elegant',
    10, '10 ساعات', '10h', 82, 86, 86,
    ARRAY['توت أحمر', 'ليتشي', 'فلفل وردي'], ARRAY['Red Berries', 'Lychee', 'Pink Pepper'],
    ARRAY['ورد بلغاري', 'فاوانيا', 'ياسمين'], ARRAY['Bulgarian Rose', 'Peony', 'Jasmine'],
    ARRAY['فانيليا كريمية', 'مسك ناعم', 'عنبر'], ARRAY['Creamy Vanilla', 'Soft Musk', 'Amber'],
    '[{"size":"30ml","price":640,"compare_price":760,"in_stock":true},{"size":"50ml","price":820,"compare_price":980,"in_stock":true},{"size":"100ml","price":1380,"compare_price":1650,"in_stock":true}]',
    false, true
  )
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  subtitle_ar = EXCLUDED.subtitle_ar,
  subtitle_en = EXCLUDED.subtitle_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  image_url = EXCLUDED.image_url,
  gallery_images = EXCLUDED.gallery_images,
  is_top_seller = EXCLUDED.is_top_seller,
  concentration = EXCLUDED.concentration,
  gender = EXCLUDED.gender,
  season = EXCLUDED.season,
  time_of_day = EXCLUDED.time_of_day,
  scent_vibe = EXCLUDED.scent_vibe,
  longevity = EXCLUDED.longevity,
  longevity_label_ar = EXCLUDED.longevity_label_ar,
  longevity_label_en = EXCLUDED.longevity_label_en,
  longevity_percent = EXCLUDED.longevity_percent,
  sillage = EXCLUDED.sillage,
  sillage_percent = EXCLUDED.sillage_percent,
  top_notes_ar = EXCLUDED.top_notes_ar,
  top_notes_en = EXCLUDED.top_notes_en,
  heart_notes_ar = EXCLUDED.heart_notes_ar,
  heart_notes_en = EXCLUDED.heart_notes_en,
  base_notes_ar = EXCLUDED.base_notes_ar,
  base_notes_en = EXCLUDED.base_notes_en,
  sizes = EXCLUDED.sizes,
  featured = EXCLUDED.featured,
  active = EXCLUDED.active;

UPDATE products
SET is_top_seller = (id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

UPDATE products
SET active = false
WHERE id IN (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'ffffffff-ffff-4fff-8fff-ffffffffffff'
);

INSERT INTO quiz_questions (id, questions)
VALUES (
  'default',
  $$[
    {"id":"quiz-occasion","question_ar":"متى تحب استخدام عطرك؟","question_en":"When do you like to wear your fragrance?","options":[
      {"id":"occasion-evening","label_ar":"في المساء والمناسبات","label_en":"Evenings and occasions","desc_ar":"حضور دافئ ولافت","desc_en":"A warm, memorable presence","recommended_product_ids":["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],"weight":1},
      {"id":"occasion-day","label_ar":"في الصباح وكل يوم","label_en":"Mornings and everyday","desc_ar":"انتعاش يناسب يومك","desc_en":"Freshness for every day","recommended_product_ids":["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],"weight":1}
    ]},
    {"id":"quiz-notes","question_ar":"أي النفحات أقرب إلى ذوقك؟","question_en":"Which notes are closest to your taste?","options":[
      {"id":"notes-oud","label_ar":"العود والعنبر","label_en":"Oud and amber","recommended_product_ids":["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],"weight":1},
      {"id":"notes-warm","label_ar":"الفانيليا والتوابل","label_en":"Vanilla and spices","recommended_product_ids":["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],"weight":1},
      {"id":"notes-fresh","label_ar":"الحمضيات والمسك","label_en":"Citrus and musk","recommended_product_ids":["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],"weight":1}
    ]},
    {"id":"quiz-presence","question_ar":"كيف تحب أن يكون حضور عطرك؟","question_en":"How do you want your fragrance to feel?","options":[
      {"id":"presence-bold","label_ar":"قوي ولافت","label_en":"Bold and distinctive","recommended_product_ids":["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],"weight":1},
      {"id":"presence-soft","label_ar":"ناعم ومتوازن","label_en":"Soft and balanced","recommended_product_ids":["dddddddd-dddd-4ddd-8ddd-dddddddddddd","cccccccc-cccc-4ccc-8ccc-cccccccccccc"],"weight":1}
    ]}
  ]$$::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  questions = EXCLUDED.questions,
  updated_at = now();

INSERT INTO coupons (id, code, title_ar, title_en, discount_type, discount_value, min_order_amount, show_on_home, active)
VALUES
  ('77777777-7777-4777-8777-777777777777', 'MADAR15', 'خصم 15٪', '15% off', 'percentage', 15, 0, true, true),
  ('88888888-8888-4888-8888-888888888888', 'ORBIT150', 'خصم 150 ج.م', '150 EGP off', 'fixed', 150, 1200, true, true)
ON CONFLICT (code) DO UPDATE SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_order_amount = EXCLUDED.min_order_amount,
  show_on_home = EXCLUDED.show_on_home,
  active = EXCLUDED.active;

DO $$
DECLARE
  table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['categories', 'products', 'coupons', 'quiz_questions', 'store_settings', 'orders', 'customers']
    LOOP
      IF to_regclass(format('public.%I', table_name)) IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = table_name
        )
      THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END
$$;
