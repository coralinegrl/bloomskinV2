USE bloomskin;
GO

IF COL_LENGTH('productos', 'imagen_url') IS NULL
BEGIN
  ALTER TABLE productos ADD imagen_url NVARCHAR(255) NULL;
END
GO
