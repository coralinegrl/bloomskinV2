IF COL_LENGTH('pedidos', 'eliminado_en') IS NULL
BEGIN
  ALTER TABLE pedidos ADD eliminado_en DATETIME2 NULL;
END;
