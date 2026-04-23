-- ============================================================
-- BLOOMSKIN — Catálogo Real 2026
-- Ejecutar en bloomskin DB después de schema.sql
-- Primero limpiar productos de ejemplo:
-- DELETE FROM productos;
-- DBCC CHECKIDENT ('productos', RESEED, 0);
-- ============================================================
USE bloomskin;
GO

-- img_clase cicla entre p-img-1 y p-img-8

-- ══════════════════════════════════════════
-- LIMPIADORES
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'Abib',       N'Pore Cleansing Oil Heartleaf OilWash 200ml',              N'Limpiadores', 21.61, 28990, 20, N'★★★★★', 0, N'p-img-2'),
(N'SKIN1004',   N'Madagascar Centella Ampoule Foam',                         N'Limpiadores', 21.99, 29990, 18, N'★★★★★', 0, N'p-img-3'),
(N'SKIN1004',   N'Madagascar Centella Poremizing Deep Cleansing Foam 125ml', N'Limpiadores', 21.99, 29990, 22, N'★★★★★', 0, N'p-img-4'),
(N'Celimax',    N'Derma Nature Fresh Blackhead Jojoba Cleansing Oil',        N'Limpiadores', 14.69, 20990, 15, N'★★★★☆', 0, N'p-img-1'),
(N'Ariul',      N'Smooth & Pure Deep Clean Cleansing Foam 80ml',             N'Limpiadores',  8.04, 12990, 30, N'★★★★☆', 0, N'p-img-5'),
(N'By Juccy',   N'Gooseberry AHA Jelly Cleanser 120ml',                     N'Limpiadores', 21.99, 29990, 12, N'★★★★★', 0, N'p-img-6'),
(N'Anua',       N'Heartleaf Quercetinol Pore Deep Cleansing Foam 150ml',    N'Limpiadores', 21.99, 29990, 25, N'★★★★★', 0, N'p-img-2'),
(N'Mary & May', N'Rice + Glutathione LHA Cleansing Oil 200ml',              N'Limpiadores', 21.25, 28990, 10, N'★★★★★', 0, N'p-img-7'),
(N'Celimax',    N'The Real Noni Acne Bubble Cleanser 155ml',                N'Limpiadores', 17.04, 23740, 18, N'★★★★☆', 0, N'p-img-3'),
(N'VT Cosmetics',N'AZ Care Cleansing Oil 200ml',                            N'Limpiadores', 15.28, 21990, 14, N'★★★★☆', 0, N'p-img-8'),
(N'SKIN1004',   N'Madagascar Centella Tea-trica BHA Foam',                  N'Limpiadores', 21.99, 29990, 20, N'★★★★★', 0, N'p-img-1'),
(N'Round Lab',  N'1025 Dokdo Cleanser',                                     N'Limpiadores', 15.93, 22200, 16, N'★★★★★', 0, N'p-img-4'),
(N'VT Cosmetics',N'Cica Mask Cleanser',                                     N'Limpiadores',  8.05, 12000, 25, N'★★★★☆', 0, N'p-img-6');

-- ══════════════════════════════════════════
-- TÓNICOS
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'By Wishtrend',  N'Mandelic Acid Gentle Exfoliating Toner 150ml',       N'Tónicos', 21.25, 28990, 15, N'★★★★★', 0, N'p-img-5'),
(N'IT''S SKIN',    N'Snail Collagen Active Toner 120ml',                   N'Tónicos', 15.28, 21990, 20, N'★★★★☆', 0, N'p-img-7'),
(N'numbuzin',      N'No.9 NAD+ PDRN 50 Peptides Glow Boosting Toner 150ml',N'Tónicos',14.15, 20000, 10, N'★★★★★', 0, N'p-img-2'),
(N'Real Barrier',  N'Extreme Essence Toner',                               N'Tónicos', 18.68, 25990, 18, N'★★★★★', 0, N'p-img-8');

-- ══════════════════════════════════════════
-- ESENCIAS
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'numbuzin',     N'No.9 Essence | NAD+ BIO Lifting-sil Essence 50ml',   N'Esencias', 21.99, 29990, 12, N'★★★★★', 0, N'p-img-3'),
(N'K-SECRET',     N'SEOUL 1988 Essence: Snail Mucin 97% + Rice',          N'Esencias', 17.04, 23740, 20, N'★★★★★', 0, N'p-img-6'),
(N'VT Cosmetics', N'PDRN Essence 100 30ml',                               N'Esencias', 21.99, 29990, 15, N'★★★★★', 0, N'p-img-1'),
(N'iUNIK',        N'Beta-Glucan Lacto Barrier Milk Essence',              N'Esencias', 25.09, 33990, 10, N'★★★★★', 0, N'p-img-4');

-- ══════════════════════════════════════════
-- SERUMS
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'TIAM',         N'Hyaluronic Water Plumping Serum 40ml',                   N'Serums', 12.93, 18740, 25, N'★★★★★', 0, N'p-img-5'),
(N'VT Cosmetics', N'Red Booster Reedle Shot 100 50ml',                       N'Serums', 25.93, 34990, 10, N'★★★★★', 0, N'p-img-7'),
(N'K-SECRET',     N'SEOUL 1988 Serum: Retinal Liposome 2% + Black Ginseng 30ml',N'Serums',18.68,25990, 14, N'★★★★★', 0, N'p-img-2'),
(N'VT Cosmetics', N'Reedle Shot 100 50ml',                                   N'Serums', 21.99, 29990, 18, N'★★★★★', 0, N'p-img-8'),
(N'By Wishtrend', N'Mandelic Acid Dark Spot Correcting Serum 30ml',          N'Serums', 21.25, 28990, 12, N'★★★★★', 0, N'p-img-3'),
(N'HaruHaru Wonder',N'Black Rice Night Knight Retinol Serum 20ml',           N'Serums', 15.28, 21990, 20, N'★★★★★', 0, N'p-img-1'),
(N'Some By Mi',   N'Galactomyces Pure Vitamin C Glow Serum 30ml',            N'Serums', 19.61, 26990, 16, N'★★★★★', 0, N'p-img-6'),
(N'numbuzin',     N'No. 3 Blue Bio-Retinol Pore Refining Serum 30ml',        N'Serums', 21.99, 29990, 14, N'★★★★★', 0, N'p-img-4'),
(N'numbuzin',     N'No.5+ Vitamin Concentrated Serum',                       N'Serums', 21.99, 29990, 12, N'★★★★★', 0, N'p-img-5'),
(N'K-SECRET',     N'SEOUL 1988 Glow Serum: Niacinamide 15% + Yuja',         N'Serums', 14.62, 20500, 22, N'★★★★★', 0, N'p-img-7'),
(N'Some By Mi',   N'Retinol Intense Reactivating Serum',                     N'Serums', 21.99, 29990, 15, N'★★★★★', 0, N'p-img-2'),
(N'PURITO',       N'Azelaic Acid + Kojic Acid + Tea Tree Serum',             N'Serums', 13.86, 19990, 18, N'★★★★☆', 0, N'p-img-8'),
(N'PURITO',       N'TXA + Niacinamide + Retinal Serum',                      N'Serums', 13.86, 19990, 18, N'★★★★☆', 0, N'p-img-3'),
(N'iUNIK',        N'Beta-Glucan Power Moisture Serum',                       N'Serums', 19.42, 26800, 14, N'★★★★★', 0, N'p-img-6');

-- ══════════════════════════════════════════
-- AMPOLLAS
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'numbuzin',   N'No 5 Glutathione TXA Advanced Dark Spot Ampoule Concentrate', N'Ampollas', 25.93, 34990, 10, N'★★★★★', 0, N'p-img-1'),
(N'SKIN1004',   N'Madagascar Centella Poremizing Fresh Ampoule Jumbo',           N'Ampollas', 21.99, 29990, 15, N'★★★★★', 0, N'p-img-4'),
(N'Celimax',    N'The Real Noni Energy Ampoule',                                 N'Ampollas', 25.09, 33990, 12, N'★★★★★', 0, N'p-img-7'),
(N'SKIN1004',   N'Madagascar Centella Ampoule 100ml',                            N'Ampollas', 21.99, 29990, 18, N'★★★★★', 0, N'p-img-2'),
(N'SKIN1004',   N'Probio-Cica Intensive Ampoule',                                N'Ampollas', 21.99, 29990, 14, N'★★★★★', 0, N'p-img-5'),
(N'SKIN1004',   N'Madagascar Centella Tone Brightening Capsule Ampoule Jumbo',   N'Ampollas', 21.99, 29990, 16, N'★★★★★', 0, N'p-img-8'),
(N'VT Cosmetics',N'PDRN Reedle Shot Hair Ampoule (300/700)',                     N'Ampollas', 21.99, 29990, 10, N'★★★★☆', 0, N'p-img-3');

-- ══════════════════════════════════════════
-- CONTORNO DE OJOS
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'SKIN1004', N'Madagascar Centella Probio-Cica Bakuchiol Eye Cream', N'Contorno de Ojos', 12.21, 17990, 15, N'★★★★★', 0, N'p-img-6');

-- ══════════════════════════════════════════
-- CREMAS HIDRATANTES
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'Dr. Althea',   N'345 Relief Cream',                                N'Hidratantes', 25.09, 33740, 10, N'★★★★★', 0, N'p-img-1'),
(N'By Juccy',     N'Gooseberry Juicy Glow-Up Gel Cream',             N'Hidratantes', 18.68, 25990, 14, N'★★★★★', 0, N'p-img-5'),
(N'SKIN1004',     N'Madagascar Centella ProbioCica Enrich Cream',     N'Hidratantes', 19.42, 26800, 16, N'★★★★★', 0, N'p-img-3'),
(N'Some By Mi',   N'Retinol Bakuchiol Dual Cream',                    N'Hidratantes', 17.77, 24990, 12, N'★★★★★', 0, N'p-img-7'),
(N'PURITO',       N'Panthenol 10% Post-Acne Cream',                  N'Hidratantes', 10.26, 15000, 20, N'★★★★★', 0, N'p-img-2'),
(N'Real Barrier', N'Extreme Cream Light',                             N'Hidratantes', 13.22, 18990, 18, N'★★★★★', 0, N'p-img-8');

-- ══════════════════════════════════════════
-- PROTECTOR SOLAR
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'SKIN1004',      N'Hyalu-Cica Silky-Fit Sun Stick 20g',                         N'Protección Solar', 16.03, 22490, 20, N'★★★★★', 0, N'p-img-4'),
(N'Camellia',      N'Deep Collagen Firming Sun Serum SPF50+ Broad Spectrum',       N'Protección Solar', 23.60, 31990, 12, N'★★★★★', 0, N'p-img-6'),
(N'Mary & May',    N'Vegan Niacinamide Panthenol Sun Cushion SPF50+ PA++++ 25g',  N'Protección Solar', 22.86, 30990, 14, N'★★★★★', 0, N'p-img-1'),
(N'menthology',    N'Super Cool Sun Block SPF50',                                  N'Protección Solar', 14.69, 20990, 18, N'★★★★☆', 0, N'p-img-5'),
(N'Some By Mi',    N'V10 Hyal Air Fit Sunscreen SPF50',                           N'Protección Solar', 21.99, 29990, 16, N'★★★★★', 0, N'p-img-7'),
(N'HaruHaru Wonder',N'Black Rice Moisture Airyfit Daily Sunscreen SPF50+ PA++++ 50ml',N'Protección Solar',17.77,24990,20,N'★★★★★', 0, N'p-img-2'),
(N'Round Lab',     N'Birch Juice Moisturizing Sun Cream SPF50+ PA++++',           N'Protección Solar', 13.22, 18990, 22, N'★★★★★', 0, N'p-img-8'),
(N'TOCOBO',        N'Cotton Soft Sun Stick SPF50+ PA++++',                        N'Protección Solar', 13.22, 18990, 25, N'★★★★★', 0, N'p-img-3'),
(N'TOCOBO',        N'Bio Watery Sun Cream SPF50+ PA++++',                         N'Protección Solar', 18.31, 25500, 18, N'★★★★★', 0, N'p-img-6'),
(N'iUNIK',         N'Beta-Glucan Barrier Sunscreen',                              N'Protección Solar', 20.89, 29100, 15, N'★★★★★', 0, N'p-img-4');

-- ══════════════════════════════════════════
-- MAQUILLAJE
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, precio_oferta_clp, stock, badge, estrellas, resenas, img_clase) VALUES
(N'A''PIEU',    N'Honey & Milk Lip Oil 5g',                      N'Maquillaje',  4.04,  7990, NULL, 30, N'sale', N'★★★★☆', 0, N'p-img-5');

INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'UNLEASHIA', N'Glitterpedia EyePalette 6.6g',                  N'Maquillaje', 20.52, 27990, 12, N'★★★★★', 0, N'p-img-7'),
(N'rom&nd',    N'DEWY FUL WATER TINT 02 Salty Peach',            N'Maquillaje', 13.22, 18990, 20, N'★★★★★', 0, N'p-img-2'),
(N'TOCOBO',    N'Juicy Berry Plumping Lip Oil 05 Rosy Girl',      N'Maquillaje', 10.96, 15990, 18, N'★★★★★', 0, N'p-img-8'),
(N'TIRTIR',    N'Waterism Glow Tint Mini (grapen/mauve rose/sand mond)',N'Maquillaje', 7.35,11250, 25, N'★★★★★', 0, N'p-img-3'),
(N'Parnell',   N'Cicamanu Serum Compact Cushion Foundation',     N'Maquillaje', 14.15, 19990, 14, N'★★★★☆', 0, N'p-img-1'),
(N'2aN',       N'Glaze Bouncing Tint 4.5g',                      N'Maquillaje', 10.26, 14990, 22, N'★★★★★', 0, N'p-img-6');

-- ══════════════════════════════════════════
-- EXTRAS
-- ══════════════════════════════════════════
INSERT INTO productos (marca, nombre, categoria, precio_usd, precio_clp, stock, estrellas, resenas, img_clase) VALUES
(N'Hero',          N'Mighty Patch Surface Patch',                              N'Extras',  8.79, 12990, 35, N'★★★★★', 0, N'p-img-4'),
(N'ETUDE',         N'My Lash Serum',                                           N'Extras',  8.41, 12500, 20, N'★★★★★', 0, N'p-img-7'),
(N'VT Cosmetics',  N'AZ Care Toner Pad 60ea',                                  N'Extras', 13.86, 19990, 16, N'★★★★★', 0, N'p-img-2'),
(N'SKIN1004',      N'Madagascar Centella Watergel Sheet Ampoule Mask Set',     N'Extras', 13.22, 19100, 18, N'★★★★★', 0, N'p-img-5'),
(N'VT Cosmetics',  N'Collagen Reedle Shot 100 2Step Mask',                     N'Extras',  6.17,  9990, 30, N'★★★★★', 0, N'p-img-8'),
(N'K-SECRET',      N'SEOUL 1988 Boosting Ball – Collagen 100%',                N'Extras',  6.17,  9990, 25, N'★★★★★', 0, N'p-img-3'),
(N'VT Cosmetics',  N'31 Skinpack Cica',                                        N'Extras',  6.71, 10000, 30, N'★★★★☆', 0, N'p-img-1'),
(N'GROWUS',        N'Sea Salt Therapy Scalp Scaler 250g',                      N'Extras', 21.25, 28990,  8, N'★★★★★', 0, N'p-img-6'),
(N'numbuzin',      N'No.5+ Concentrated Toner Pad with Glutathione & Niacinamide',N'Extras',21.99,29990,15,N'★★★★★', 0, N'p-img-4'),
(N'VT Cosmetics',  N'Cica Daily Soothing Mask 30 pcs',                         N'Extras', 14.15, 20000, 18, N'★★★★★', 0, N'p-img-7'),
(N'SKINFOOD',      N'Rice Brightening Daily Mask',                             N'Extras', 13.86, 19990, 20, N'★★★★☆', 0, N'p-img-2'),
(N'VT Cosmetics',  N'Lip Plumper Vol. 90',                                     N'Extras',  7.88, 11990, 22, N'★★★★★', 0, N'p-img-5');

-- ══════════════════════════════════════════
-- Verificar total
-- SELECT COUNT(*) AS total_productos, categoria, COUNT(*) AS por_categoria
-- FROM productos GROUP BY categoria ORDER BY categoria;
-- ══════════════════════════════════════════
GO
