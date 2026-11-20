-- Optional, administrator-assigned labels. Existing products remain untagged.
IF COL_LENGTH('productos', 'tipos_piel_json') IS NULL
  ALTER TABLE productos ADD tipos_piel_json NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH('productos', 'necesidades_json') IS NULL
  ALTER TABLE productos ADD necesidades_json NVARCHAR(MAX) NULL;
GO
