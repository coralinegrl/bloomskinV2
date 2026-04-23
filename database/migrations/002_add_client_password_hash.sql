USE bloomskin;
GO

IF COL_LENGTH('clientes', 'password_hash') IS NULL
BEGIN
  ALTER TABLE clientes ADD password_hash NVARCHAR(255) NULL;
END
GO
