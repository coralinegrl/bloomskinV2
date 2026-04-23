IF NOT EXISTS (
  SELECT 1
  FROM sys.tables
  WHERE name = 'cliente_wishlist'
)
BEGIN
  CREATE TABLE cliente_wishlist (
    id INT IDENTITY(1,1) PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    creado_en DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT UQ_cliente_wishlist UNIQUE (cliente_id, producto_id)
  );

  CREATE INDEX IX_cliente_wishlist_cliente ON cliente_wishlist(cliente_id);
  CREATE INDEX IX_cliente_wishlist_producto ON cliente_wishlist(producto_id);
END
GO
