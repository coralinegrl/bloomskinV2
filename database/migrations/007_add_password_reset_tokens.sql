IF NOT EXISTS (
  SELECT 1
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[password_reset_tokens]')
    AND type = N'U'
)
BEGIN
  CREATE TABLE password_reset_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    token_hash NVARCHAR(255) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    used_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
  );

  CREATE INDEX IX_password_reset_tokens_cliente ON password_reset_tokens(cliente_id);
  CREATE INDEX IX_password_reset_tokens_expires ON password_reset_tokens(expires_at);
END
