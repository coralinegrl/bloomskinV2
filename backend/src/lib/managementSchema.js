async function ensureManagementSchema(pool) {
  await pool.request().batch(`
    IF OBJECT_ID('dbo.admin_activity','U') IS NULL CREATE TABLE dbo.admin_activity (
      id INT IDENTITY PRIMARY KEY, admin_id INT NULL, action NVARCHAR(20) NOT NULL,
      resource NVARCHAR(200) NOT NULL, created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
    IF COL_LENGTH('admin_activity','detail') IS NULL ALTER TABLE admin_activity ADD detail NVARCHAR(400) NULL;
    IF OBJECT_ID('dbo.inventory_movements','U') IS NULL CREATE TABLE dbo.inventory_movements (
      id INT IDENTITY PRIMARY KEY, producto_id INT NOT NULL, variant NVARCHAR(120) NOT NULL DEFAULT '',
      before_qty INT NOT NULL, after_qty INT NOT NULL, reason NVARCHAR(250) NOT NULL,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
    IF OBJECT_ID('dbo.order_fulfillment','U') IS NULL CREATE TABLE dbo.order_fulfillment (
      pedido_id INT PRIMARY KEY REFERENCES pedidos(id), checked_json NVARCHAR(MAX) NOT NULL DEFAULT '[]',
      carrier NVARCHAR(80) NOT NULL DEFAULT '', tracking_number NVARCHAR(100) NOT NULL DEFAULT '',
      tracking_url NVARCHAR(1200) NOT NULL DEFAULT '', admin_note NVARCHAR(1000) NOT NULL DEFAULT '',
      updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
    IF COL_LENGTH('productos','publication_status') IS NULL ALTER TABLE productos ADD publication_status NVARCHAR(20) NOT NULL DEFAULT 'published';
    IF OBJECT_ID('dbo.restock_alerts','U') IS NULL CREATE TABLE dbo.restock_alerts (
      id INT IDENTITY PRIMARY KEY, producto_id INT NOT NULL REFERENCES productos(id), variant NVARCHAR(120) NOT NULL DEFAULT '',
      email NVARCHAR(254) NOT NULL, status NVARCHAR(20) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0,
      created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
      CONSTRAINT UX_restock_alert UNIQUE(producto_id,variant,email));
  `);
  // A trigger covers every stock writer, including cancellations, imports and reservations.
  await pool.request().batch(`CREATE OR ALTER TRIGGER dbo.tr_inventory_movements ON dbo.productos AFTER INSERT, UPDATE AS
  BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.inventory_movements(producto_id,variant,before_qty,after_qty,reason)
    SELECT i.id,'',ISNULL(d.stock,0),i.stock,N'Ajuste de inventario'
    FROM inserted i LEFT JOIN deleted d ON d.id=i.id
    WHERE i.usa_tonos=0 AND (ISNULL(d.stock,0)<>i.stock OR ISNULL(d.usa_tonos,0)<>i.usa_tonos);
    INSERT INTO dbo.inventory_movements(producto_id,variant,before_qty,after_qty,reason)
    SELECT i.id,m.variant,m.before_qty,m.after_qty,N'Ajuste de inventario'
    FROM inserted i LEFT JOIN deleted d ON d.id=i.id
    CROSS APPLY (
      SELECT COALESCE(a.[key],b.[key]) variant,ISNULL(TRY_CONVERT(INT,b.[value]),0) before_qty,ISNULL(TRY_CONVERT(INT,a.[value]),0) after_qty
      FROM OPENJSON(CASE WHEN ISJSON(i.tonos_stock_json)=1 AND i.usa_tonos=1 THEN i.tonos_stock_json ELSE '{}' END) a
      FULL JOIN OPENJSON(CASE WHEN ISJSON(d.tonos_stock_json)=1 AND d.usa_tonos=1 THEN d.tonos_stock_json ELSE '{}' END) b ON b.[key]=a.[key]
    ) m
    WHERE m.before_qty<>m.after_qty;
    INSERT INTO dbo.admin_activity(action,resource,detail)
    SELECT 'PRICE',CONCAT(N'Producto #',i.id),CONCAT(i.nombre,N': $',d.precio_clp,N' → $',i.precio_clp)
    FROM inserted i JOIN deleted d ON d.id=i.id WHERE i.precio_clp<>d.precio_clp;
  END;`);
}
function adminActivity(req, res, next) {
  res.on('finish', () => {
    if (req.user?.tipo !== 'admin' || !['POST','PUT','PATCH','DELETE'].includes(req.method) || res.statusCode >= 400) return;
    const { getPool, sql } = require('../config/db');
    getPool().then(pool => pool.request().input('admin', sql.Int, req.user.id).input('action', sql.NVarChar, req.method)
      .input('resource', sql.NVarChar, req.path.slice(0,200)).query('INSERT INTO admin_activity(admin_id,action,resource) VALUES(@admin,@action,@resource)'))
      .catch(error => console.error('No se pudo registrar actividad:', error.code || error.name));
  });
  next();
}
module.exports = { ensureManagementSchema, adminActivity };
