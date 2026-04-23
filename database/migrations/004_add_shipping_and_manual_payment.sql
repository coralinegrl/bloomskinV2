IF COL_LENGTH('pedidos', 'subtotal_clp') IS NULL
BEGIN
  ALTER TABLE pedidos ADD subtotal_clp INT NULL;
END
GO

IF COL_LENGTH('pedidos', 'envio_clp') IS NULL
BEGIN
  ALTER TABLE pedidos ADD envio_clp INT NOT NULL CONSTRAINT DF_pedidos_envio_clp DEFAULT 0;
END
GO

IF COL_LENGTH('pedidos', 'metodo_pago') IS NULL
BEGIN
  ALTER TABLE pedidos ADD metodo_pago NVARCHAR(50) NOT NULL CONSTRAINT DF_pedidos_metodo_pago DEFAULT 'bank_transfer';
END
GO

IF COL_LENGTH('pedidos', 'metodo_envio') IS NULL
BEGIN
  ALTER TABLE pedidos ADD metodo_envio NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH('pedidos', 'ciudad_envio') IS NULL
BEGIN
  ALTER TABLE pedidos ADD ciudad_envio NVARCHAR(120) NULL;
END
GO

IF COL_LENGTH('pedidos', 'direccion_envio') IS NULL
BEGIN
  ALTER TABLE pedidos ADD direccion_envio NVARCHAR(255) NULL;
END
GO

IF COL_LENGTH('pedidos', 'referencia_envio') IS NULL
BEGIN
  ALTER TABLE pedidos ADD referencia_envio NVARCHAR(255) NULL;
END
GO

IF COL_LENGTH('pedidos', 'distancia_envio_km') IS NULL
BEGIN
  ALTER TABLE pedidos ADD distancia_envio_km DECIMAL(8,2) NULL;
END
GO

UPDATE pedidos
SET subtotal_clp = total_clp
WHERE subtotal_clp IS NULL;
GO
