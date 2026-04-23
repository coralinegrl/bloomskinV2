USE bloomskin;
GO

IF COL_LENGTH('clientes', 'activo') IS NULL
BEGIN
  ALTER TABLE clientes ADD activo BIT NOT NULL DEFAULT 1;
END

IF COL_LENGTH('mensajes', 'activo') IS NULL
BEGIN
  ALTER TABLE mensajes ADD activo BIT NOT NULL DEFAULT 1;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_clientes_activo' AND object_id = OBJECT_ID('clientes'))
BEGIN
  CREATE INDEX IX_clientes_activo ON clientes(activo);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_mensajes_activo' AND object_id = OBJECT_ID('mensajes'))
BEGIN
  CREATE INDEX IX_mensajes_activo ON mensajes(activo);
END
GO
