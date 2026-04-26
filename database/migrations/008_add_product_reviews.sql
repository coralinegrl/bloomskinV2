IF OBJECT_ID('product_reviews', 'U') IS NULL
BEGIN
  CREATE TABLE product_reviews (
    id INT IDENTITY(1,1) PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id),
    producto_id INT NOT NULL REFERENCES productos(id),
    pedido_id INT NOT NULL REFERENCES pedidos(id),
    rating INT NOT NULL,
    contenido NVARCHAR(700) NOT NULL,
    activo BIT NOT NULL CONSTRAINT DF_product_reviews_activo DEFAULT 1,
    creado_en DATETIME2 NOT NULL CONSTRAINT DF_product_reviews_creado_en DEFAULT SYSUTCDATETIME(),
    actualizado_en DATETIME2 NOT NULL CONSTRAINT DF_product_reviews_actualizado_en DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_product_reviews_rating CHECK (rating BETWEEN 1 AND 5)
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_product_reviews_cliente_producto' AND object_id = OBJECT_ID('product_reviews'))
BEGIN
  CREATE UNIQUE INDEX UX_product_reviews_cliente_producto ON product_reviews(cliente_id, producto_id);
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_product_reviews_producto_activo' AND object_id = OBJECT_ID('product_reviews'))
BEGIN
  CREATE INDEX IX_product_reviews_producto_activo ON product_reviews(producto_id, activo, creado_en);
END;
