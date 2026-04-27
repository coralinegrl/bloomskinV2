-- ============================================================
-- BLOOMSKIN — Schema SQL Server
-- Ejecutar en SQL Server Management Studio o sqlcmd
-- ============================================================

CREATE DATABASE bloomskin;
GO
USE bloomskin;
GO

-- Usuarios administradores
CREATE TABLE usuarios (
  id            INT IDENTITY(1,1) PRIMARY KEY,
  nombre        NVARCHAR(100)  NOT NULL,
  email         NVARCHAR(150)  NOT NULL UNIQUE,
  password_hash NVARCHAR(255)  NOT NULL,
  rol           NVARCHAR(20)   NOT NULL DEFAULT 'admin',
  activo        BIT            NOT NULL DEFAULT 1,
  creado_en     DATETIME2      NOT NULL DEFAULT GETDATE()
);

-- Productos del catálogo
CREATE TABLE productos (
  id                INT IDENTITY(1,1) PRIMARY KEY,
  marca             NVARCHAR(100)  NOT NULL,
  nombre            NVARCHAR(255)  NOT NULL,
  descripcion       NVARCHAR(MAX),
  categoria         NVARCHAR(50),
  precio_usd        DECIMAL(10,2)  NOT NULL,
  precio_clp        INT            NOT NULL,
  precio_oferta_clp INT            NULL,
  oferta_hasta      DATE           NULL,
  stock             INT            NOT NULL DEFAULT 0,
  badge             NVARCHAR(20)   NULL,
  estrellas         NVARCHAR(10)   NOT NULL DEFAULT N'★★★★★',
  resenas           INT            NOT NULL DEFAULT 0,
  img_clase         NVARCHAR(20)   NOT NULL DEFAULT 'p-img-1',
  imagen_url        NVARCHAR(255)  NULL,
  activo            BIT            NOT NULL DEFAULT 1,
  usa_tonos         BIT            NOT NULL DEFAULT 0,
  tonos_json        NVARCHAR(MAX)  NULL,
  tonos_stock_json  NVARCHAR(MAX)  NULL,
  creado_en         DATETIME2      NOT NULL DEFAULT GETDATE(),
  actualizado_en    DATETIME2      NOT NULL DEFAULT GETDATE()
);

-- Clientes
CREATE TABLE clientes (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  nombre      NVARCHAR(150)  NOT NULL,
  email       NVARCHAR(150)  NOT NULL UNIQUE,
  password_hash NVARCHAR(255),
  rut         NVARCHAR(20),
  telefono    NVARCHAR(20),
  direccion   NVARCHAR(255),
  ciudad      NVARCHAR(100),
  region      NVARCHAR(120),
  tipo_piel   NVARCHAR(30),
  notas       NVARCHAR(MAX),
  creado_en   DATETIME2      NOT NULL DEFAULT GETDATE()
);

-- Pedidos
CREATE TABLE pedidos (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  cliente_id      INT           NOT NULL REFERENCES clientes(id),
  subtotal_clp    INT           NULL,
  subtotal_pagado_clp INT       NULL,
  descuento_codigo NVARCHAR(50) NULL,
  descuento_porcentaje INT      NULL,
  descuento_clp   INT           NOT NULL DEFAULT 0,
  stock_comprometido BIT        NOT NULL DEFAULT 0,
  reserva_expira_en DATETIME2   NULL,
  comprobante_limite_en DATETIME2 NULL,
  total_clp       INT           NOT NULL,
  cliente_nombre  NVARCHAR(150),
  cliente_email   NVARCHAR(150),
  cliente_rut     NVARCHAR(20),
  cliente_telefono NVARCHAR(20),
  estado          NVARCHAR(20)  NOT NULL DEFAULT 'pending',
  origen          NVARCHAR(20)  NOT NULL DEFAULT 'store',
  region_envio    NVARCHAR(120),
  comprobante_url NVARCHAR(500),
  notas           NVARCHAR(MAX),
  creado_en       DATETIME2     NOT NULL DEFAULT GETDATE(),
  actualizado_en  DATETIME2     NOT NULL DEFAULT GETDATE()
);

-- Codigos promocionales
CREATE TABLE discount_codes (
  id                INT IDENTITY(1,1) PRIMARY KEY,
  code              NVARCHAR(50)  NOT NULL UNIQUE,
  name              NVARCHAR(120) NOT NULL,
  description       NVARCHAR(500) NULL,
  discount_percent  INT           NOT NULL,
  max_uses          INT           NULL,
  used_count        INT           NOT NULL DEFAULT 0,
  starts_at         DATETIME2     NULL,
  ends_at           DATETIME2     NULL,
  min_subtotal_clp  INT           NULL,
  active            BIT           NOT NULL DEFAULT 1,
  created_en        DATETIME2     NOT NULL DEFAULT GETDATE(),
  updated_en        DATETIME2     NOT NULL DEFAULT GETDATE()
);

CREATE TABLE checkout_reservations (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  cliente_id  INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  expires_en  DATETIME2 NOT NULL,
  created_en  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_en  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE checkout_reservation_items (
  id             INT IDENTITY(1,1) PRIMARY KEY,
  reservation_id INT NOT NULL REFERENCES checkout_reservations(id) ON DELETE CASCADE,
  producto_id    INT NOT NULL REFERENCES productos(id),
  cantidad       INT NOT NULL
);

-- Líneas de pedido
CREATE TABLE pedido_items (
  id                  INT IDENTITY(1,1) PRIMARY KEY,
  pedido_id           INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id         INT NOT NULL REFERENCES productos(id),
  cantidad            INT NOT NULL DEFAULT 1,
  precio_unitario_clp INT NOT NULL
);

-- Wishlist por clienta
CREATE TABLE cliente_wishlist (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  cliente_id  INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  creado_en   DATETIME2 NOT NULL DEFAULT GETDATE(),
  CONSTRAINT UQ_cliente_wishlist UNIQUE (cliente_id, producto_id)
);

-- Resenas verificadas por compra
CREATE TABLE product_reviews (
  id              INT IDENTITY(1,1) PRIMARY KEY,
  cliente_id      INT NOT NULL REFERENCES clientes(id),
  producto_id     INT NOT NULL REFERENCES productos(id),
  pedido_id       INT NOT NULL REFERENCES pedidos(id),
  rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  contenido       NVARCHAR(700) NOT NULL,
  activo          BIT NOT NULL DEFAULT 1,
  creado_en       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  actualizado_en  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_product_reviews_cliente_producto UNIQUE (cliente_id, producto_id)
);

-- Mensajes / Consultas
CREATE TABLE mensajes (
  id          INT IDENTITY(1,1) PRIMARY KEY,
  cliente_id  INT           NULL REFERENCES clientes(id),
  nombre      NVARCHAR(150) NOT NULL,
  email       NVARCHAR(150) NOT NULL,
  tipo        NVARCHAR(20)  NOT NULL DEFAULT 'consult',
  contenido   NVARCHAR(MAX) NOT NULL,
  leido       BIT           NOT NULL DEFAULT 0,
  respondido  BIT           NOT NULL DEFAULT 0,
  creado_en   DATETIME2     NOT NULL DEFAULT GETDATE()
);

-- Newsletter
CREATE TABLE suscriptores (
  id        INT IDENTITY(1,1) PRIMARY KEY,
  email     NVARCHAR(150) NOT NULL UNIQUE,
  activo    BIT           NOT NULL DEFAULT 1,
  creado_en DATETIME2     NOT NULL DEFAULT GETDATE()
);

-- Índices
CREATE INDEX IX_productos_activo ON productos(activo);
CREATE INDEX IX_pedidos_estado   ON pedidos(estado);
CREATE INDEX IX_pedidos_cliente  ON pedidos(cliente_id);
CREATE INDEX IX_discount_codes_active ON discount_codes(active, starts_at, ends_at);
CREATE UNIQUE INDEX UX_checkout_reservations_cliente_id ON checkout_reservations(cliente_id);
CREATE INDEX IX_checkout_reservations_expires_en ON checkout_reservations(expires_en);
CREATE INDEX IX_checkout_reservation_items_reservation_id ON checkout_reservation_items(reservation_id);
CREATE INDEX IX_mensajes_leido   ON mensajes(leido);
CREATE INDEX IX_cliente_wishlist_cliente ON cliente_wishlist(cliente_id);
CREATE INDEX IX_product_reviews_producto_activo ON product_reviews(producto_id, activo, creado_en);

-- ============================================================
-- DATOS SEMILLA
-- ============================================================

-- Nota: el hash de 'bloomskin2025' se genera automáticamente
-- al ejecutar `node backend/src/scripts/seed-admin.js`
-- Por ahora insertamos un placeholder que el script reemplazará.

INSERT INTO productos (marca,nombre,categoria,precio_usd,precio_clp,precio_oferta_clp,stock,badge,estrellas,resenas,img_clase) VALUES
(N'Some By Mi',       N'AHA BHA PHA 30 Days Miracle Toner',       N'Toners',           15.99,18990,22990,24,N'hot', N'★★★★★',248,N'p-img-1'),
(N'COSRX',            N'Advanced Snail 96 Mucin Power Essence',    N'Sueros',           18.50,22490,NULL, 15,N'new', N'★★★★★',412,N'p-img-2'),
(N'Beauty of Joseon', N'Relief Sun: Rice + Probiotics SPF50+',     N'Protección Solar', 16.99,19990,24990, 8,N'sale',N'★★★★☆',186,N'p-img-3'),
(N'Laneige',          N'Water Sleeping Mask EX Lavender',          N'Mascarillas',      23.00,27990,NULL, 20,NULL,  N'★★★★★',324,N'p-img-4'),
(N'Innisfree',        N'Green Tea Seed Hyaluronic Serum',          N'Sueros',           20.50,24490,28990, 5,N'hot', N'★★★★★',198,N'p-img-5'),
(N'Anua',             N'Heartleaf 77% Soothing Toner',             N'Toners',           18.00,21990,NULL, 31,N'new', N'★★★★★',271,N'p-img-6'),
(N'Dr. Jart+',        N'Cicapair Tiger Grass Cream',               N'Hidratantes',      26.00,31490,36990, 0,N'sale',N'★★★★☆',142,N'p-img-7'),
(N'Etude House',      N'Soon Jung Panthensoside Cica Balm',        N'Hidratantes',      14.00,16990,NULL, 12,NULL,  N'★★★★★', 89,N'p-img-8');

INSERT INTO clientes (nombre,email,telefono,ciudad,tipo_piel) VALUES
(N'Valentina Reyes',  N'vale.reyes@gmail.com', N'+56 9 8234 5678', N'Santiago',    N'Mixta'),
(N'Camila Fernández', N'cami.f@hotmail.com',   N'+56 9 7654 3210', N'Valparaíso',  N'Seca'),
(N'Isidora Muñoz',    N'isi.munoz@gmail.com',  N'+56 9 9123 4567', N'Concepción',  N'Grasa'),
(N'Sofía Torres',     N'sofia.t@outlook.com',  N'+56 9 6543 2109', N'Santiago',    N'Sensible'),
(N'Renata Castro',    N'renata.c@gmail.com',   N'+56 9 5432 1098', N'Antofagasta', N'Mixta');
GO
