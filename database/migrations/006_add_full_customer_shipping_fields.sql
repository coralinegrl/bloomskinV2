IF COL_LENGTH('clientes', 'rut') IS NULL
BEGIN
  ALTER TABLE clientes ADD rut NVARCHAR(20) NULL;
END
GO

IF COL_LENGTH('clientes', 'direccion') IS NULL
BEGIN
  ALTER TABLE clientes ADD direccion NVARCHAR(255) NULL;
END
GO

IF COL_LENGTH('clientes', 'region') IS NULL
BEGIN
  ALTER TABLE clientes ADD region NVARCHAR(120) NULL;
END
GO

IF COL_LENGTH('pedidos', 'cliente_nombre') IS NULL
BEGIN
  ALTER TABLE pedidos ADD cliente_nombre NVARCHAR(150) NULL;
END
GO

IF COL_LENGTH('pedidos', 'cliente_email') IS NULL
BEGIN
  ALTER TABLE pedidos ADD cliente_email NVARCHAR(150) NULL;
END
GO

IF COL_LENGTH('pedidos', 'cliente_rut') IS NULL
BEGIN
  ALTER TABLE pedidos ADD cliente_rut NVARCHAR(20) NULL;
END
GO

IF COL_LENGTH('pedidos', 'cliente_telefono') IS NULL
BEGIN
  ALTER TABLE pedidos ADD cliente_telefono NVARCHAR(20) NULL;
END
GO

IF COL_LENGTH('pedidos', 'region_envio') IS NULL
BEGIN
  ALTER TABLE pedidos ADD region_envio NVARCHAR(120) NULL;
END
GO

UPDATE p
SET
  cliente_nombre = COALESCE(p.cliente_nombre, c.nombre),
  cliente_email = COALESCE(p.cliente_email, c.email),
  cliente_rut = COALESCE(p.cliente_rut, c.rut),
  cliente_telefono = COALESCE(p.cliente_telefono, c.telefono)
FROM pedidos p
JOIN clientes c ON c.id = p.cliente_id;
GO
