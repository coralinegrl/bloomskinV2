IF COL_LENGTH('productos', 'tonos_stock_json') IS NULL
BEGIN
  ALTER TABLE productos ADD tonos_stock_json NVARCHAR(MAX) NULL;
END;
