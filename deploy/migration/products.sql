-- Migration of products from Replit to VPS
-- Run on the VPS:  psql "$DATABASE_URL" -f deploy/migration/products.sql

BEGIN;

-- Clear any existing products (DB is empty after fresh setup, this is just a safety)
TRUNCATE TABLE products RESTART IDENTITY CASCADE;

INSERT INTO products (id, name, description, price, category, image_url, min_order_qty, stock, created_at) VALUES
(1, 'قميص رجالي كلاسيكي', 'قميص رجالي عالي الجودة مناسب للمناسبات الرسمية واليومية، متوفر بألوان متعددة', 850.00, 'قمصان', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600', 6, 500, '2026-04-29 09:07:25.139511+00'),
(2, 'بنطلون جينز', 'بنطلون جينز كلاسيكي متين للرجال، مريح ومناسب لجميع المناسبات', 1200.00, 'بناطيل', 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=600', 6, 300, '2026-04-29 09:07:25.139511+00'),
(3, 'فستان نسائي صيفي', 'فستان نسائي خفيف وأنيق للموسم الصيفي، تصميم عصري وألوان زاهية', 950.00, 'فساتين', 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=600', 6, 200, '2026-04-29 09:07:25.139511+00'),
(4, 'جاكيت شتوي رجالي', 'جاكيت شتوي دافئ وعصري، مناسب لفصل الشتاء الجزائري القارس', 2200.00, 'جاكيتات', 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600', 3, 150, '2026-04-29 09:07:25.139511+00'),
(5, 'تيشيرت قطني', 'تيشيرت قطني 100% مريح ومتنفس، مناسب للاستخدام اليومي، متوفر بجميع الأحجام', 450.00, 'قمصان', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', 6, 800, '2026-04-29 09:07:25.139511+00'),
(6, 'عباءة نسائية فاخرة', 'عباءة نسائية من قماش جودة عالية، تصميم أنيق يجمع الأصالة والحداثة', 1800.00, 'عبايات', 'https://images.unsplash.com/photo-1594938298870-024f77e67a11?w=600', 3, 100, '2026-04-29 09:07:25.139511+00');

-- Reset sequence so next insert continues from 7
SELECT setval('products_id_seq', 6, true);

COMMIT;
