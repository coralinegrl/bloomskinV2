<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="sidebar-logo-text">bloomskin</span>
        <span class="sidebar-badge">Admin</span>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.section"
          class="nav-item"
          :class="{ active: activeSection === item.section }"
          @click="activeSection = item.section"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <RouterLink to="/" class="exit-btn">Volver a la tienda</RouterLink>
        <button class="logout-btn" @click="handleLogout">Cerrar sesion</button>
      </div>
    </aside>

    <main class="admin-main">
      <div class="admin-topbar">
        <div>
          <div class="topbar-title">{{ currentTitle }}</div>
          <div class="topbar-subtitle">
            <span v-if="loading">Cargando datos...</span>
            <span v-else-if="lastSyncLabel">Actualizado {{ lastSyncLabel }}</span>
            <span v-else>Sin sincronizacion reciente</span>
          </div>
        </div>

        <div class="topbar-right">
          <span v-if="error" class="status-chip status-error">{{ error }}</span>
          <span v-else-if="loading" class="status-chip status-loading">Sincronizando</span>
          <span v-else class="status-chip status-ok">Conectado</span>
          <button class="btn-ghost" :disabled="refreshing" @click="refreshAll">
            {{ refreshing ? 'Actualizando...' : 'Actualizar' }}
          </button>
          <span class="topbar-user">{{ auth.user?.nombre || 'Admin' }}</span>
          <div class="avatar">{{ auth.user?.nombre?.[0] || 'A' }}</div>
        </div>
      </div>

      <div class="admin-content">
        <div v-if="toast.show" class="toast" :class="`toast-${toast.kind}`">
          {{ toast.message }}
        </div>

        <template v-if="loading && !hasAnyData">
          <div class="loading-shell">
            <div class="skeleton-card" v-for="n in 4" :key="`s-${n}`"></div>
          </div>
        </template>

        <template v-else>
          <template v-if="activeSection === 'dashboard'">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Ventas del mes</div>
                <div class="stat-value">{{ fmt(stats.ventas_mes || 0) }}</div>
                <div class="stat-change up">Seguimiento mensual</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Pedidos totales</div>
                <div class="stat-value">{{ stats.total_pedidos || 0 }}</div>
                <div class="stat-change">{{ (stats.pendientes_pago || 0) + (stats.pagos_por_validar || 0) }} en espera</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Productos activos</div>
                <div class="stat-value">{{ productosActivos }}</div>
                <div class="stat-change">Catalogo visible</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Sin stock</div>
                <div class="stat-value">{{ sinStock }}</div>
                <div class="stat-change" :class="sinStock > 0 ? 'down' : 'up'">
                  {{ sinStock > 0 ? 'Revisar inventario' : 'Inventario sano' }}
                </div>
              </div>
            </div>

            <div class="dash-grid">
              <div class="ad-card">
                <div class="ad-card-title">Ultimos pedidos</div>
                <div v-if="pedidos.length === 0" class="empty-state">No hay pedidos aun.</div>
                <button
                  v-for="p in pedidos.slice(0, 6)"
                  :key="p.id"
                  class="recent-order"
                  @click="openOrderDetails(p.id)"
                >
                  <div>
                    <div class="order-code">{{ p.codigo }}</div>
                    <div class="order-name">{{ p.cliente_nombre }}</div>
                  </div>
                  <div class="recent-order-right">
                    <div class="order-amt">{{ fmt(p.total_clp) }}</div>
                    <span class="status-pill" :class="`s-${p.estado}`">{{ estadoLabel(p.estado) }}</span>
                  </div>
                </button>
              </div>

              <div class="ad-card">
                <div class="ad-card-title">Stock bajo o sin stock</div>
                <div v-if="productosStockBajo.length === 0" class="empty-state">Todo el stock esta OK.</div>
                <div v-for="p in productosStockBajo" :key="p.id" class="stock-alert-item">
                  <div>
                    <div class="sa-brand">{{ p.marca }}</div>
                    <div class="sa-name">{{ p.nombre }}</div>
                  </div>
                  <span class="stock-pill" :class="p.stock === 0 ? 'stock-zero' : 'stock-warn'">
                    {{ p.stock === 0 ? 'Sin stock' : `Solo ${p.stock}` }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="selectedOrder" class="ad-card detail-card">
              <div class="detail-header">
                <div>
                  <div class="ad-card-title">Detalle del pedido {{ selectedOrder.codigo }}</div>
                  <div class="detail-subtitle">{{ selectedOrder.cliente_nombre }} - {{ selectedOrder.cliente_email }}</div>
                </div>
                <span class="status-pill" :class="`s-${selectedOrder.estado}`">{{ estadoLabel(selectedOrder.estado) }}</span>
              </div>

              <div class="detail-grid">
                <div>
                  <div class="detail-label">Fecha</div>
                  <div>{{ formatDateTime(selectedOrder.creado_en) }}</div>
                </div>
                <div>
                  <div class="detail-label">Ciudad envio</div>
                  <div>{{ selectedOrder.ciudad_envio || selectedOrder.cliente_ciudad_actual || 'Sin ciudad' }}</div>
                </div>
                <div>
                  <div class="detail-label">Total</div>
                  <div class="td-price">{{ fmt(selectedOrder.total_clp) }}</div>
                </div>
                <div>
                  <div class="detail-label">Items</div>
                  <div>{{ selectedOrder.items?.length || 0 }}</div>
                </div>
                <div>
                  <div class="detail-label">Subtotal</div>
                  <div>{{ fmt(selectedOrder.subtotal_clp || selectedOrder.total_clp) }}</div>
                </div>
                <div>
                  <div class="detail-label">Envio</div>
                  <div>{{ fmt(selectedOrder.envio_clp || 0) }}</div>
                </div>
                <div>
                  <div class="detail-label">Pago</div>
                  <div>{{ selectedOrder.metodo_pago || 'Sin definir' }}</div>
                </div>
                <div>
                  <div class="detail-label">Metodo envio</div>
                  <div>{{ selectedOrder.metodo_envio || 'Sin definir' }}</div>
                </div>
              </div>

              
              <div class="detail-grid">
                <div>
                  <div class="detail-label">Cliente</div>
                  <div>{{ selectedOrder.cliente_nombre || selectedOrder.cliente_nombre_actual || 'Sin nombre' }}</div>
                </div>
                <div>
                  <div class="detail-label">RUT</div>
                  <div>{{ selectedOrder.cliente_rut || selectedOrder.cliente_rut_actual || 'Sin RUT' }}</div>
                </div>
                <div>
                  <div class="detail-label">Telefono</div>
                  <div>{{ selectedOrder.cliente_telefono || selectedOrder.cliente_telefono_actual || 'Sin telefono' }}</div>
                </div>
                <div>
                  <div class="detail-label">Region</div>
                  <div>{{ selectedOrder.region_envio || selectedOrder.cliente_region_actual || 'Sin region' }}</div>
                </div>
              </div>

              <div class="order-notes">
                <div class="detail-label">Despacho</div>
                <p>{{ selectedOrder.direccion_envio || 'Sin direccion' }}</p>
                <p>{{ selectedOrder.region_envio || selectedOrder.cliente_region_actual || 'Sin region' }} - {{ selectedOrder.ciudad_envio || selectedOrder.cliente_ciudad_actual || 'Sin ciudad' }}</p>
                <p v-if="selectedOrder.referencia_envio">{{ selectedOrder.referencia_envio }}</p>
                <p v-if="selectedOrder.distancia_envio_km">Distancia: {{ selectedOrder.distancia_envio_km }} km</p>
                <p v-if="selectedOrder.comprobante_url">
                  <a :href="selectedOrder.comprobante_url" target="_blank" rel="noreferrer">Ver comprobante</a>
                </p>
              </div>

              <div class="order-items">
                <div class="detail-label">Productos</div>
                <div v-for="item in selectedOrder.items || []" :key="`${selectedOrder.id}-${item.producto_nombre}`" class="order-item-row">
                  <span>{{ item.producto_marca }} - {{ item.producto_nombre }}</span>
                  <span>{{ item.cantidad }} x {{ fmt(item.precio_unitario_clp) }}</span>
                </div>
              </div>

              <div v-if="selectedOrder.notas" class="order-notes">
                <div class="detail-label">Notas</div>
                <p>{{ selectedOrder.notas }}</p>
              </div>
            </div>
          </template>

          <template v-if="activeSection === 'productos'">
            <div class="section-actions">
              <div>
                <h2 class="section-h2">Productos</h2>
                <p class="section-copy">Administra catalogo, precios y stock.</p>
              </div>
              <div class="actions-row">
                <input v-model.trim="productoSearch" class="toolbar-input" type="text" placeholder="Buscar producto o marca">
                <select v-model="productoStockFilter" class="toolbar-select">
                  <option value="all">Todo el stock</option>
                  <option value="low">Solo stock bajo</option>
                  <option value="out">Solo sin stock</option>
                </select>
                <button class="btn-primary" @click="openProductoModal()">Agregar producto</button>
              </div>
            </div>

            <CatalogJsonManager @toast="showToast" @imported="refreshAll" />

            <div class="ad-card table-card">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Imagen</th>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th>USD</th>
                    <th>Precio CLP</th>
                    <th>Oferta</th>
                    <th>Stock</th>
                    <th>Badge</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredProductos.length === 0">
                    <td colspan="10" class="empty-state table-empty">No hay productos para ese filtro.</td>
                  </tr>
                  <tr v-for="(p, i) in filteredProductos" :key="p.id">
                    <td class="muted">{{ i + 1 }}</td>
                    <td>
                      <div class="product-thumb" :class="{ empty: !p.imagen_url }">
                        <img v-if="p.imagen_url" :src="p.imagen_url" :alt="p.nombre">
                        <span v-else>Sin imagen</span>
                      </div>
                    </td>
                    <td>
                      <div class="td-name">{{ p.nombre }}</div>
                      <span class="muted d-block">{{ p.categoria || 'Sin categoria' }}</span>
                    </td>
                    <td>{{ p.marca }}</td>
                    <td class="muted">{{ p.precio_usd ? `$${p.precio_usd}` : '-' }}</td>
                    <td class="td-price">{{ fmt(p.precio_clp) }}</td>
                    <td class="muted">{{ p.precio_oferta_clp ? fmt(p.precio_oferta_clp) : '-' }}</td>
                    <td>
                      <div class="stock-editor">
                        <span class="stock-pill" :class="stockClass(p.stock)">{{ stockLabel(p.stock) }}</span>
                        <input
                          v-model.number="stockDrafts[p.id]"
                          class="stock-input"
                          type="number"
                          min="0"
                          @click.stop
                        >
                        <button
                          class="btn-stock"
                          :disabled="savingStockId === p.id || Number(stockDrafts[p.id]) === Number(p.stock)"
                          @click.stop="guardarStockRapido(p)"
                        >
                          {{ savingStockId === p.id ? '...' : 'Guardar' }}
                        </button>
                      </div>
                    </td>
                    <td class="muted">{{ p.imagen_url ? 'Real' : 'Fallback' }}</td>
                    <td class="muted">{{ badgeLabel(p.badge) }}</td>
                    <td class="td-actions">
                      <button class="btn-edit" @click="openProductoModal(p)">Editar</button>
                      <button class="btn-delete" @click="eliminarProducto(p.id)">Eliminar</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeSection === 'pedidos'">
            <div class="section-actions">
              <div>
                <h2 class="section-h2">Pedidos</h2>
                <p class="section-copy">Monitorea el flujo operativo y cambia estados.</p>
              </div>
              <div class="actions-row">
                <input v-model.trim="pedidoSearch" class="toolbar-input" type="text" placeholder="Buscar codigo, cliente o email">
                <select v-model="pedidoEstadoFilter" class="toolbar-select">
                  <option value="all">Todos los estados</option>
                  <option value="pending_payment">Esperando transferencia</option>
                  <option value="payment_submitted">Comprobante recibido</option>
                  <option value="paid">Pago validado</option>
                  <option value="shipped">Enviado</option>
                  <option value="delivered">Entregado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>

            <div class="ad-card table-card">
              <table>
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Cambiar estado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredPedidos.length === 0">
                    <td colspan="6" class="empty-state table-empty">No hay pedidos para ese filtro.</td>
                  </tr>
                  <tr
                    v-for="p in filteredPedidos"
                    :key="p.id"
                    :class="{ 'row-active': selectedOrderId === p.id }"
                    @click="openOrderDetails(p.id)"
                  >
                    <td class="td-code">{{ p.codigo }}</td>
                    <td>{{ p.cliente_nombre }}<span class="muted d-block">{{ p.cliente_email }}</span></td>
                    <td class="muted">{{ formatDate(p.creado_en) }}</td>
                    <td class="td-price">{{ fmt(p.total_clp) }}</td>
                    <td><span class="status-pill" :class="`s-${p.estado}`">{{ estadoLabel(p.estado) }}</span></td>
                    <td>
                      <select class="estado-select" :value="p.estado" @click.stop @change="cambiarEstado(p.id, $event.target.value)">
                        <option value="pending_payment">Esperando transferencia</option>
                        <option value="payment_submitted">Comprobante recibido</option>
                        <option value="paid">Pago validado</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeSection === 'clientes'">
            <div class="section-actions">
              <div>
                <h2 class="section-h2">Clientes</h2>
                <p class="section-copy">Revisa el historial y segmenta por tipo de piel.</p>
              </div>
              <div class="actions-row">
                <input v-model.trim="clienteSearch" class="toolbar-input" type="text" placeholder="Buscar cliente, email o ciudad">
              </div>
            </div>

            <div class="summary-strip">
              <div class="summary-pill">Clientes: {{ filteredClientes.length }}</div>
              <div class="summary-pill">Con notas: {{ clientesConNotas }}</div>
              <div class="summary-pill">Top ciudad: {{ topCiudad }}</div>
            </div>

            <div class="ad-card table-card">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>RUT</th>
                    <th>Telefono</th>
                    <th>Direccion</th>
                    <th>Ciudad</th>
                    <th>Region</th>
                    <th>Pedidos</th>
                    <th>Total comprado</th>
                    <th>Tipo de piel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredClientes.length === 0">
                    <td colspan="10" class="empty-state table-empty">No hay clientes para ese filtro.</td>
                  </tr>
                  <tr v-for="c in filteredClientes" :key="c.id">
                    <td class="td-bold">{{ c.nombre }}</td>
                    <td class="muted">{{ c.email }}</td>
                    <td class="muted">{{ c.rut || 'Sin RUT' }}</td>
                    <td class="muted">{{ c.telefono || 'Sin telefono' }}</td>
                    <td>{{ c.direccion || 'Sin direccion' }}</td>
                    <td>{{ c.ciudad || 'Sin ciudad' }}</td>
                    <td>{{ c.region || 'Sin region' }}</td>
                    <td>{{ c.total_pedidos }}</td>
                    <td class="td-price">{{ fmt(c.total_comprado || 0) }}</td>
                    <td><span v-if="c.tipo_piel" class="skin-pill">{{ c.tipo_piel }}</span><span v-else class="muted">Sin dato</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <template v-if="activeSection === 'mensajes'">
            <div class="section-actions">
              <div>
                <h2 class="section-h2">Mensajes</h2>
                <p class="section-copy">Prioriza respuestas y limpia pendientes.</p>
              </div>
              <div class="actions-row">
                <input v-model.trim="mensajeSearch" class="toolbar-input" type="text" placeholder="Buscar nombre, email o contenido">
                <label class="toggle-row">
                  <input v-model="soloNoLeidos" type="checkbox">
                  <span>Solo no leidos</span>
                </label>
              </div>
            </div>

            <div class="summary-strip">
              <div class="summary-pill">Sin leer: {{ noLeidos }}</div>
              <div class="summary-pill">Sin responder: {{ mensajesPendientes }}</div>
              <div class="summary-pill">Total: {{ filteredMensajes.length }}</div>
            </div>

            <div class="messages-list">
              <div v-if="filteredMensajes.length === 0" class="empty-state">No hay mensajes para ese filtro.</div>
              <div
                v-for="m in filteredMensajes"
                :key="m.id"
                class="msg-item"
                :class="{ unread: !m.leido }"
              >
                <div class="msg-top">
                  <span class="msg-name">
                    {{ m.nombre }}
                    <span v-if="!m.leido" class="unread-dot"></span>
                  </span>
                  <div class="msg-meta">
                    <span class="msg-tag" :class="`mt-${m.tipo}`">{{ tipoLabel(m.tipo) }}</span>
                    <span class="msg-time">{{ formatDateTime(m.creado_en) }}</span>
                  </div>
                </div>
                <div class="msg-preview">{{ m.contenido }}</div>
                <div class="msg-footer">
                  <span class="msg-email">{{ m.email }}</span>
                  <div class="actions-row">
                    <button v-if="!m.leido" class="btn-respond btn-secondary" @click="marcarLeido(m)">Marcar leido</button>
                    <button v-if="!m.respondido" class="btn-respond" @click="marcarRespondido(m)">Marcar respondido</button>
                    <span v-else class="responded-badge">Respondido</span>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-if="activeSection === 'newsletter'">
            <div class="section-actions">
              <div>
                <h2 class="section-h2">Newsletter</h2>
                <p class="section-copy">Gestiona suscriptoras y envia campanas de email desde Bloomskin.</p>
              </div>
              <div class="actions-row">
                <input v-model.trim="suscriptorSearch" class="toolbar-input" type="text" placeholder="Buscar suscriptora por email">
              </div>
            </div>

            <div class="summary-strip">
              <div class="summary-pill">Activas: {{ suscriptoresActivos }}</div>
              <div class="summary-pill">Total: {{ filteredSuscriptores.length }}</div>
              <div class="summary-pill">Ultima carga: {{ lastSyncLabel || 'Sin datos' }}</div>
            </div>

            <div class="dash-grid newsletter-grid">
              <div class="ad-card">
                <div class="ad-card-title">Enviar campana</div>

                <div class="form-group">
                  <label>Asunto</label>
                  <input v-model="newsletterForm.subject" type="text" placeholder="Ej. Nuevos favoritos coreanos llegaron a Bloomskin">
                </div>

                <div class="form-group">
                  <label>Titular</label>
                  <input v-model="newsletterForm.headline" type="text" placeholder="Skincare tips y hallazgos de la semana">
                </div>

                <div class="form-group">
                  <label>Preview text</label>
                  <input v-model="newsletterForm.previewText" type="text" placeholder="Lo que se ve debajo del asunto en algunos correos">
                </div>

                <div class="form-group">
                  <label>Contenido</label>
                  <textarea v-model="newsletterForm.body" rows="7" placeholder="Escribe aqui la campana. Puedes separar parrafos con una linea en blanco."></textarea>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Boton CTA</label>
                    <input v-model="newsletterForm.ctaLabel" type="text" placeholder="Ver catalogo">
                  </div>
                  <div class="form-group">
                    <label>Link CTA</label>
                    <input v-model="newsletterForm.ctaUrl" type="text" placeholder="https://bloomskin.cl/catalogo">
                  </div>
                </div>

                <div class="form-hint">
                  Configura SMTP en el backend para enviar de verdad.
                  Variables: <strong>SMTP_HOST</strong>, <strong>SMTP_PORT</strong>, <strong>SMTP_USER</strong>, <strong>SMTP_PASS</strong>, <strong>SMTP_FROM</strong>.
                </div>

                <div class="modal-actions">
                  <button class="btn-ghost" type="button" @click="resetNewsletterForm">Limpiar</button>
                  <button class="btn-primary" type="button" :disabled="sendingNewsletter" @click="enviarNewsletter">
                    {{ sendingNewsletter ? 'Enviando...' : 'Enviar newsletter' }}
                  </button>
                </div>
              </div>

              <div class="ad-card table-card">
                <div class="newsletter-list-header">
                  <div class="ad-card-title">Suscriptoras</div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Estado</th>
                      <th>Alta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="filteredSuscriptores.length === 0">
                      <td colspan="3" class="empty-state table-empty">No hay suscriptoras para ese filtro.</td>
                    </tr>
                    <tr v-for="suscriptor in filteredSuscriptores" :key="suscriptor.id">
                      <td class="td-bold">{{ suscriptor.email }}</td>
                      <td>
                        <span class="status-pill" :class="suscriptor.activo ? 's-delivered' : 's-cancelled'">
                          {{ suscriptor.activo ? 'Activa' : 'Inactiva' }}
                        </span>
                      </td>
                      <td class="muted">{{ formatDateTime(suscriptor.creado_en) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <template v-if="activeSection === 'home'">
            <div class="section-actions">
              <div>
                <h2 class="section-h2">Home</h2>
                <p class="section-copy">Configura contenido del home, footer y datos de transferencia sin tocar codigo.</p>
              </div>
              <div class="actions-row">
                <button class="btn-primary" type="button" :disabled="savingSiteSettings" @click="guardarSiteSettings">
                  {{ savingSiteSettings ? 'Guardando...' : 'Guardar contenido del sitio' }}
                </button>
              </div>
            </div>

            <div class="home-settings-grid">
              <article class="ad-card home-tile-card">
                <div class="ad-card-title">Hero principal</div>
                <div class="form-group">
                  <label>Etiqueta</label>
                  <input v-model="siteSettings.home.hero.tag" type="text">
                </div>
                <div class="form-group">
                  <label>Titulo</label>
                  <input v-model="siteSettings.home.hero.title" type="text">
                </div>
                <div class="form-group">
                  <label>Enfasis</label>
                  <input v-model="siteSettings.home.hero.emphasis" type="text">
                </div>
                <div class="form-group">
                  <label>Descripcion</label>
                  <textarea v-model="siteSettings.home.hero.description" rows="4"></textarea>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>CTA principal</label>
                    <input v-model="siteSettings.home.hero.primary_cta_label" type="text">
                  </div>
                  <div class="form-group">
                    <label>CTA secundario</label>
                    <input v-model="siteSettings.home.hero.secondary_cta_label" type="text">
                  </div>
                </div>
              </article>

              <article class="ad-card home-tile-card">
                <div class="ad-card-title">Barra de beneficios</div>
                <div
                  v-for="(promo, index) in siteSettings.home.promoItems"
                  :key="`promo-admin-${index}`"
                  class="settings-subblock"
                >
                  <div class="detail-label">Tarjeta {{ index + 1 }}</div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Icono</label>
                      <input v-model="promo.icon" type="text" placeholder="?? o flag-kr">
                    </div>
                    <div class="form-group">
                      <label>Titulo</label>
                      <input v-model="promo.title" type="text">
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Texto</label>
                    <input v-model="promo.copy" type="text">
                  </div>
                </div>
              </article>
            </div>

            <div class="home-settings-grid">
              <article
                v-for="(tile, index) in siteSettings.home.categoryTiles"
                :key="`home-tile-${index}`"
                class="ad-card home-tile-card"
              >
                <div class="ad-card-title">Tarjeta {{ index + 1 }}</div>

                <div class="form-group">
                  <label>Categoria</label>
                  <select v-model="tile.category">
                    <option>Serums</option>
                    <option>Hidratantes</option>
                    <option>Limpiadores</option>
                    <option>Proteccion Solar</option>
                    <option>Maquillaje</option>
                    <option>Tonicos</option>
                    <option>Esencias</option>
                    <option>Ampollas</option>
                    <option>Contorno de Ojos</option>
                    <option>Extras</option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Titulo visible</label>
                  <input v-model="tile.label" type="text" placeholder="Ej. Proteccion Solar">
                </div>

                <div class="form-group">
                  <label>Imagen URL</label>
                  <input v-model="tile.image_url" type="text" placeholder="/uploads/portada/categoria.png">
                </div>

                <div class="upload-row">
                  <input type="file" accept="image/png,image/webp,image/jpeg" @change="handleHomeImagePicked(index, $event)">
                  <span class="muted" v-if="uploadingHomeIndex === index">Subiendo imagen...</span>
                </div>

                <div v-if="tile.image_url" class="image-preview home-image-preview">
                  <img :src="tile.image_url" :alt="tile.label || tile.category">
                  <span>{{ tile.image_url }}</span>
                </div>
              </article>
            </div>

            <div class="home-settings-grid">
              <article class="ad-card home-tile-card">
                <div class="ad-card-title">Secciones de productos</div>
                <div class="settings-subblock">
                  <div class="detail-label">Best sellers</div>
                  <div class="form-group">
                    <label>Etiqueta</label>
                    <input v-model="siteSettings.home.bestSellers.tag" type="text">
                  </div>
                  <div class="form-group">
                    <label>Titulo</label>
                    <input v-model="siteSettings.home.bestSellers.title" type="text">
                  </div>
                  <div class="form-group">
                    <label>Texto</label>
                    <textarea v-model="siteSettings.home.bestSellers.copy" rows="3"></textarea>
                  </div>
                  <div class="form-group">
                    <label>Texto enlace</label>
                    <input v-model="siteSettings.home.bestSellers.link_label" type="text">
                  </div>
                </div>

                <div class="settings-subblock">
                  <div class="detail-label">Novedades</div>
                  <div class="form-group">
                    <label>Etiqueta</label>
                    <input v-model="siteSettings.home.newIn.tag" type="text">
                  </div>
                  <div class="form-group">
                    <label>Titulo</label>
                    <input v-model="siteSettings.home.newIn.title" type="text">
                  </div>
                  <div class="form-group">
                    <label>Texto</label>
                    <textarea v-model="siteSettings.home.newIn.copy" rows="3"></textarea>
                  </div>
                  <div class="form-group">
                    <label>Texto enlace</label>
                    <input v-model="siteSettings.home.newIn.link_label" type="text">
                  </div>
                </div>
              </article>

              <article class="ad-card home-tile-card">
                <div class="ad-card-title">Editorial y CTA</div>
                <div class="form-group">
                  <label>Etiqueta editorial</label>
                  <input v-model="siteSettings.home.editorial.tag" type="text">
                </div>
                <div class="form-group">
                  <label>Titulo editorial</label>
                  <input v-model="siteSettings.home.editorial.title" type="text">
                </div>
                <div class="form-group">
                  <label>Texto editorial</label>
                  <textarea v-model="siteSettings.home.editorial.copy" rows="3"></textarea>
                </div>
                <div
                  v-for="(card, index) in siteSettings.home.editorial.cards"
                  :key="`editorial-card-${index}`"
                  class="settings-subblock"
                >
                  <div class="detail-label">Tarjeta editorial {{ index + 1 }}</div>
                  <div class="form-group">
                    <label>Eyebrow</label>
                    <input v-model="card.kicker" type="text">
                  </div>
                  <div class="form-group">
                    <label>Titulo</label>
                    <input v-model="card.title" type="text">
                  </div>
                  <div class="form-group">
                    <label>Texto</label>
                    <textarea v-model="card.copy" rows="3"></textarea>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Enlace</label>
                      <input v-model="card.link_label" type="text">
                    </div>
                    <div class="form-group">
                      <label>Categoria</label>
                      <input v-model="card.category" type="text">
                    </div>
                  </div>
                </div>
                <div class="settings-subblock">
                  <div class="detail-label">CTA catalogo</div>
                  <div class="form-group">
                    <label>Etiqueta</label>
                    <input v-model="siteSettings.home.catalogCta.tag" type="text">
                  </div>
                  <div class="form-group">
                    <label>Titulo</label>
                    <input v-model="siteSettings.home.catalogCta.title" type="text">
                  </div>
                  <div class="form-group">
                    <label>Texto</label>
                    <textarea v-model="siteSettings.home.catalogCta.copy" rows="3"></textarea>
                  </div>
                  <div class="form-group">
                    <label>Boton</label>
                    <input v-model="siteSettings.home.catalogCta.button_label" type="text">
                  </div>
                </div>
              </article>
            </div>

            <div class="home-settings-grid">
              <article class="ad-card home-tile-card">
                <div class="ad-card-title">Newsletter y footer</div>
                <div class="settings-subblock">
                  <div class="detail-label">Newsletter</div>
                  <div class="form-group">
                    <label>Etiqueta</label>
                    <input v-model="siteSettings.home.newsletter.tag" type="text">
                  </div>
                  <div class="form-group">
                    <label>Titulo</label>
                    <input v-model="siteSettings.home.newsletter.title" type="text">
                  </div>
                  <div class="form-group">
                    <label>Enfasis</label>
                    <input v-model="siteSettings.home.newsletter.emphasis" type="text">
                  </div>
                  <div class="form-group">
                    <label>Texto</label>
                    <textarea v-model="siteSettings.home.newsletter.copy" rows="3"></textarea>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Placeholder</label>
                      <input v-model="siteSettings.home.newsletter.placeholder" type="text">
                    </div>
                    <div class="form-group">
                      <label>Boton</label>
                      <input v-model="siteSettings.home.newsletter.button_label" type="text">
                    </div>
                  </div>
                </div>
                <div class="settings-subblock">
                  <div class="detail-label">Footer</div>
                  <div class="form-group">
                    <label>Subtitulo marca</label>
                    <input v-model="siteSettings.footer.brand_sub" type="text">
                  </div>
                  <div class="form-group">
                    <label>Copy</label>
                    <textarea v-model="siteSettings.footer.copy" rows="3"></textarea>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Instagram URL</label>
                      <input v-model="siteSettings.footer.instagram_url" type="text">
                    </div>
                    <div class="form-group">
                      <label>WhatsApp URL</label>
                      <input v-model="siteSettings.footer.whatsapp_url" type="text">
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Email</label>
                      <input v-model="siteSettings.footer.email" type="text">
                    </div>
                    <div class="form-group">
                      <label>Instagram handle</label>
                      <input v-model="siteSettings.footer.instagram_handle" type="text">
                    </div>
                  </div>
                  <div class="form-group">
                    <label>WhatsApp visible</label>
                    <input v-model="siteSettings.footer.whatsapp_label" type="text">
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Pie izquierdo</label>
                      <input v-model="siteSettings.footer.bottom_left" type="text">
                    </div>
                    <div class="form-group">
                      <label>Pie derecho</label>
                      <input v-model="siteSettings.footer.bottom_right" type="text">
                    </div>
                  </div>
                </div>
              </article>

              <article class="ad-card home-tile-card">
                <div class="ad-card-title">Transferencia bancaria</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Banco</label>
                    <input v-model="siteSettings.payment.bank_name" type="text">
                  </div>
                  <div class="form-group">
                    <label>Tipo de cuenta</label>
                    <input v-model="siteSettings.payment.account_type" type="text">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Numero de cuenta</label>
                    <input v-model="siteSettings.payment.account_number" type="text">
                  </div>
                  <div class="form-group">
                    <label>Titular</label>
                    <input v-model="siteSettings.payment.account_holder" type="text">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>RUT</label>
                    <input v-model="siteSettings.payment.account_rut" type="text">
                  </div>
                  <div class="form-group">
                    <label>Email transferencia</label>
                    <input v-model="siteSettings.payment.transfer_email" type="text">
                  </div>
                </div>
                <div class="form-group">
                  <label>Instrucciones</label>
                  <textarea v-model="siteSettings.payment.instructions" rows="5"></textarea>
                </div>
              </article>
            </div>
          </template>
        </template>
      </div>
    </main>

    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal">
          <h3 class="modal-title">{{ editingProducto ? 'Editar producto' : 'Agregar producto' }}</h3>

          <div class="form-row">
            <div class="form-group">
              <label>Marca</label>
              <input v-model="form.marca" type="text" placeholder="ej. COSRX">
            </div>
            <div class="form-group">
              <label>Badge</label>
              <select v-model="form.badge">
                <option value="">Ninguno</option>
                      <option value="hot">Mas vendido</option>
                <option value="new">Nuevo</option>
                <option value="sale">Oferta</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Nombre del producto</label>
            <input v-model="form.nombre" type="text" placeholder="ej. Advanced Snail 96 Mucin Power Essence">
          </div>

          <div class="form-group">
            <label>Descripcion</label>
            <textarea v-model="form.descripcion" rows="3" placeholder="Descripcion breve para referencia interna"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Precio USD <span class="label-hint">(se calcula CLP automatico)</span></label>
              <input v-model.number="form.precio_usd" type="number" step="0.01" placeholder="18.50" @input="calcularPrecioAuto">
            </div>
            <div class="form-group">
              <label>Precio CLP calculado</label>
              <input :value="precioCalculado ? fmt(precioCalculado) : '-'" type="text" readonly class="input-readonly">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Precio tachado CLP <span class="label-hint">(opcional)</span></label>
              <input v-model.number="form.precio_oferta_clp" type="number" placeholder="24990">
            </div>
            <div class="form-group">
              <label>Stock</label>
              <input v-model.number="form.stock" type="number" min="0" placeholder="0">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
                    <label>Categoria</label>
              <select v-model="form.categoria">
                <option>Limpiadores</option>
                <option>Tonicos</option>
                <option>Esencias</option>
                <option>Serums</option>
                <option>Ampollas</option>
                <option>Contorno de Ojos</option>
                <option>Hidratantes</option>
                <option>Proteccion Solar</option>
                <option>Maquillaje</option>
                <option>Extras</option>
              </select>
            </div>
            <div class="form-group">
              <label>Visual (clase CSS)</label>
              <select v-model="form.img_clase">
                <option v-for="n in 8" :key="n" :value="`p-img-${n}`">p-img-{{ n }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Imagen URL <span class="label-hint">(opcional, usada en la tienda si existe)</span></label>
            <input v-model="form.imagen_url" type="text" placeholder="/catalogo/catalogo-001.png">
          </div>

          <div class="form-group">
            <label>Adjuntar imagen <span class="label-hint">(sube un archivo y se completa la URL)</span></label>
            <div class="upload-row">
              <input ref="imageInput" type="file" accept="image/*" @change="handleImageFileChange">
              <button class="btn-ghost" type="button" :disabled="uploadingImage || !selectedImageFile" @click="subirImagenProducto">
                {{ uploadingImage ? 'Subiendo...' : 'Subir imagen' }}
              </button>
            </div>
            <div v-if="form.imagen_url" class="image-preview">
              <img :src="form.imagen_url" alt="Preview producto">
              <span>{{ form.imagen_url }}</span>
            </div>
          </div>

          <div class="form-hint">
                  <strong>Formula de precio:</strong> (USD + $1 envio) x 1.000 CLP x 1,19 IVA x 1,30 margen.
          </div>

          <div class="modal-actions">
            <button class="btn-ghost" @click="showModal = false">Cancelar</button>
            <button class="btn-primary" :disabled="saving" @click="guardarProducto">
              {{ saving ? 'Guardando...' : 'Guardar producto' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { clientesApi, mensajesApi, pedidosApi, productosApi, settingsApi } from '../api/index.js'
import CatalogJsonManager from '../components/admin/CatalogJsonManager.vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()

const activeSection = ref('dashboard')
const navItems = [
  { section: 'dashboard', icon: 'D', label: 'Dashboard' },
  { section: 'productos', icon: 'P', label: 'Productos' },
  { section: 'pedidos', icon: 'O', label: 'Pedidos' },
  { section: 'clientes', icon: 'C', label: 'Clientes' },
  { section: 'mensajes', icon: 'M', label: 'Mensajes' },
]
const titleMap = {
  dashboard: 'Dashboard',
  productos: 'Productos',
  pedidos: 'Pedidos',
  clientes: 'Clientes',
  mensajes: 'Mensajes',
}
navItems.push({ section: 'newsletter', icon: 'N', label: 'Newsletter' })
titleMap.newsletter = 'Newsletter'
navItems.push({ section: 'home', icon: 'H', label: 'Home' })
titleMap.home = 'Home'

const productos = ref([])
const pedidos = ref([])
const clientes = ref([])
const mensajes = ref([])
const suscriptores = ref([])
const stats = ref({})
const siteSettings = ref({
  home: {
    hero: {
      tag: 'Seleccion Bloomskin',
      title: 'Una home mas curada, con',
      emphasis: 'lo mejor primero',
      description: 'La portada muestra seleccion editorial, best sellers y rutas rapidas para descubrir productos. El catalogo completo vive aparte, con filtros de compra mas serios.',
      primary_cta_label: 'Ver mas vendidos',
      secondary_cta_label: 'Ir al catalogo',
    },
    categoryTiles: [
      { category: 'Serums', label: 'Serums', image_url: '' },
      { category: 'Hidratantes', label: 'Hidratantes', image_url: '' },
      { category: 'Limpiadores', label: 'Limpiadores', image_url: '' },
      { category: 'Proteccion Solar', label: 'Proteccion Solar', image_url: '' },
    ],
    promoItems: [
      { icon: '🚚', title: 'Envio gratis', copy: 'Sobre $49.990' },
      { icon: 'flag-kr', title: '100% originales', copy: 'Directo desde Corea del Sur' },
      { icon: '🎁', title: 'Muestras y hallazgos', copy: 'Seleccion curada para descubrir favoritos' },
      { icon: '💬', title: 'Te orientamos por WhatsApp', copy: 'Ayuda rapida para elegir tu rutina' },
    ],
    bestSellers: {
      tag: 'Best Sellers',
      title: 'Los mas vendidos',
      copy: 'Un bloque rapido con lo mas fuerte del catalogo y mejor senal comercial.',
      link_label: 'Ver catalogo',
    },
    editorial: {
      tag: 'Descubre por necesidad',
      title: 'Explora la tienda como una rutina',
      copy: 'En vez de mostrar todo de una, te guiamos por bloques mas claros y rapidos de navegar.',
      cards: [
        { kicker: 'Rutina base', title: 'Empieza por una limpieza suave', copy: 'Limpiadores y basicos para armar una rutina simple de dia o noche.', link_label: 'Explorar limpiadores ->', category: 'Limpiadores', tone: 'rose' },
        { kicker: 'Uso diario', title: 'Proteccion solar que si vas a usar todos los dias', copy: 'Solares comodos, ligeros y faciles de combinar con maquillaje.', link_label: 'Ver solares ->', category: 'Proteccion Solar', tone: 'sage' },
        { kicker: 'Tratamiento', title: 'Serums para brillo, textura y manchas', copy: 'Una seleccion rapida para quienes quieren resultados sin revisar setenta fichas seguidas.', link_label: 'Ir a serums ->', category: 'Serums', tone: 'cream' },
      ],
    },
    newIn: {
      tag: 'New In',
      title: 'Novedades y hallazgos',
      copy: 'Un bloque mas liviano para descubrir productos nuevos y cosas en tendencia.',
      link_label: 'Ver todo',
    },
    catalogCta: {
      tag: 'Catalogo completo',
      title: 'Descubre todo el catalogo Bloomskin',
      copy: 'Entra a una vista dedicada con categorias, marcas, precios, stock, promociones y orden.',
      button_label: 'Abrir catalogo',
    },
    newsletter: {
      tag: 'Unete a la comunidad',
      title: 'Skincare tips y',
      emphasis: 'ofertas exclusivas',
      copy: 'Suscribete y recibe novedades y lanzamientos de Bloomskin',
      placeholder: 'tu@email.com',
      button_label: 'Suscribirme',
    },
  },
  footer: {
    brand_sub: 'K-Beauty - Chile',
    copy: 'Skincare coreano curado para Chile, con productos originales, ayuda real y compra simple.',
    instagram_url: 'https://www.instagram.com/bloomskin__cl',
    whatsapp_url: 'https://wa.me/569948418523',
    email: 'bloomskincl1@gmail.com',
    instagram_handle: '@bloomskin__cl',
    whatsapp_label: '+56 9 9484 1853',
    bottom_left: '(c) 2026 Bloomskin - Antofagasta, Chile',
    bottom_right: 'Originales de Corea del Sur',
  },
  payment: {
    bank_name: 'Banco por definir',
    account_type: 'Cuenta corriente',
    account_number: '',
    account_holder: 'Bloomskin',
    account_rut: '',
    transfer_email: '',
    instructions: 'Transfiere el total del pedido y luego sube tu comprobante para validarlo en admin.',
  },
})

const loading = ref(true)
const refreshing = ref(false)
const error = ref('')
const lastSync = ref(null)

const toast = ref({ show: false, kind: 'ok', message: '', timer: null })

const showModal = ref(false)
const editingProducto = ref(null)
const saving = ref(false)
const uploadingImage = ref(false)
const savingStockId = ref(null)
const precioCalculado = ref(null)
const form = ref({})
const selectedImageFile = ref(null)
const imageInput = ref(null)
const stockDrafts = ref({})

const productoSearch = ref('')
const productoStockFilter = ref('all')
const pedidoSearch = ref('')
const pedidoEstadoFilter = ref('all')
const clienteSearch = ref('')
const mensajeSearch = ref('')
const soloNoLeidos = ref(false)
const selectedOrderId = ref(null)
const suscriptorSearch = ref('')
const sendingNewsletter = ref(false)
const savingSiteSettings = ref(false)
const uploadingHomeIndex = ref(null)
const newsletterForm = ref({
  subject: '',
  headline: '',
  previewText: '',
  body: '',
  ctaLabel: 'Ver catalogo',
  ctaUrl: 'http://localhost:5173/catalogo',
})

const currentTitle = computed(() => titleMap[activeSection.value])
const productosActivos = computed(() => productos.value.length)
const sinStock = computed(() => productos.value.filter(p => p.stock === 0).length)
const productosStockBajo = computed(() => productos.value.filter(p => p.stock <= 5).sort((a, b) => a.stock - b.stock))
const noLeidos = computed(() => mensajes.value.filter(m => !m.leido).length)
const mensajesPendientes = computed(() => mensajes.value.filter(m => !m.respondido).length)
const clientesConNotas = computed(() => clientes.value.filter(c => c.notas).length)
const suscriptoresActivos = computed(() => suscriptores.value.filter(s => s.activo).length)
const hasAnyData = computed(() => productos.value.length || pedidos.value.length || clientes.value.length || mensajes.value.length || suscriptores.value.length)

const lastSyncLabel = computed(() => {
  if (!lastSync.value) return ''
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(lastSync.value)
})

const filteredProductos = computed(() => {
  const q = productoSearch.value.trim().toLowerCase()
  return productos.value.filter(producto => {
    const matchesSearch = !q || [producto.nombre, producto.marca, producto.categoria]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q))

    const matchesStock = productoStockFilter.value === 'all'
      || (productoStockFilter.value === 'low' && producto.stock <= 5)
      || (productoStockFilter.value === 'out' && producto.stock === 0)

    return matchesSearch && matchesStock
  })
})

const filteredPedidos = computed(() => {
  const q = pedidoSearch.value.trim().toLowerCase()
  return pedidos.value.filter(pedido => {
    const matchesSearch = !q || [pedido.codigo, pedido.cliente_nombre, pedido.cliente_email]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q))

    const matchesStatus = pedidoEstadoFilter.value === 'all' || pedido.estado === pedidoEstadoFilter.value
    return matchesSearch && matchesStatus
  })
})

const filteredClientes = computed(() => {
  const q = clienteSearch.value.trim().toLowerCase()
  if (!q) return clientes.value
  return clientes.value.filter(cliente => [cliente.nombre, cliente.email, cliente.rut, cliente.telefono, cliente.direccion, cliente.ciudad, cliente.region]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(q)))
})

const filteredMensajes = computed(() => {
  const q = mensajeSearch.value.trim().toLowerCase()
  return mensajes.value.filter(mensaje => {
    const matchesUnread = !soloNoLeidos.value || !mensaje.leido
    const matchesSearch = !q || [mensaje.nombre, mensaje.email, mensaje.contenido]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(q))
    return matchesUnread && matchesSearch
  })
})

const filteredSuscriptores = computed(() => {
  const q = suscriptorSearch.value.trim().toLowerCase()
  if (!q) return suscriptores.value
  return suscriptores.value.filter(suscriptor => String(suscriptor.email || '').toLowerCase().includes(q))
})

const selectedOrder = computed(() => pedidos.value.find(p => p.id === selectedOrderId.value) || null)

const topCiudad = computed(() => {
  const counts = new Map()
  for (const cliente of clientes.value) {
    if (!cliente.ciudad) continue
    counts.set(cliente.ciudad, (counts.get(cliente.ciudad) || 0) + 1)
  }
  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return winner ? winner[0] : 'Sin datos'
})

function resetForm() {
  form.value = {
    marca: '',
    nombre: '',
    descripcion: '',
    categoria: 'Serums',
    precio_usd: '',
    precio_oferta_clp: '',
    stock: 0,
    badge: '',
    img_clase: 'p-img-1',
    imagen_url: '',
  }
  precioCalculado.value = null
  selectedImageFile.value = null
  if (imageInput.value) imageInput.value.value = ''
}

function syncStockDrafts() {
  stockDrafts.value = Object.fromEntries(
    productos.value.map(producto => [producto.id, Number(producto.stock || 0)])
  )
}

function showToast(message, kind = 'ok') {
  if (toast.value.timer) clearTimeout(toast.value.timer)
  toast.value = {
    show: true,
    kind,
    message,
    timer: setTimeout(() => {
      toast.value.show = false
    }, 3000),
  }
}

function handleLogout() {
  auth.logout()
  router.push('/admin/login')
}

function openProductoModal(producto = null) {
  editingProducto.value = producto
  if (producto) {
    form.value = { ...producto }
    precioCalculado.value = producto.precio_clp
    selectedImageFile.value = null
    if (imageInput.value) imageInput.value.value = ''
  } else {
    resetForm()
  }
  showModal.value = true
}

function handleImageFileChange(event) {
  selectedImageFile.value = event.target.files?.[0] || null
}

async function subirImagenProducto() {
  if (!selectedImageFile.value) {
    showToast('Selecciona una imagen antes de subirla.', 'error')
    return
  }

  uploadingImage.value = true
  try {
    const { data } = await productosApi.subirImagen(selectedImageFile.value)
    form.value.imagen_url = data.image_url
    showToast('Imagen subida correctamente.')
    selectedImageFile.value = null
    if (imageInput.value) imageInput.value.value = ''
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo subir la imagen.', 'error')
  } finally {
    uploadingImage.value = false
  }
}

function openOrderDetails(id) {
  selectedOrderId.value = id
  activeSection.value = activeSection.value === 'dashboard' ? 'dashboard' : 'pedidos'
}

async function calcularPrecioAuto() {
  const usd = parseFloat(form.value.precio_usd)
  if (!Number.isFinite(usd) || usd <= 0) {
    precioCalculado.value = null
    return
  }
  try {
    const { data } = await productosApi.calcularPrecio(usd)
    precioCalculado.value = data.precio_clp
  } catch {
    precioCalculado.value = Math.ceil((usd + 1) * 1000 * 1.19 * 1.3)
  }
}

async function guardarProducto() {
  if (!form.value.marca || !form.value.nombre || !form.value.precio_usd) {
    showToast('Marca, nombre y precio USD son obligatorios.', 'error')
    return
  }

  saving.value = true
  try {
    const payload = { ...form.value, precio_clp: precioCalculado.value }
    if (editingProducto.value) {
      await productosApi.actualizar(editingProducto.value.id, payload)
      showToast('Producto actualizado.')
    } else {
      await productosApi.crear(payload)
      showToast('Producto creado.')
    }
    await cargarProductos()
    showModal.value = false
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo guardar el producto.', 'error')
  } finally {
    saving.value = false
  }
}

async function eliminarProducto(id) {
  if (!window.confirm('Eliminar este producto? Se ocultara de la tienda.')) return
  try {
    await productosApi.eliminar(id)
    await cargarProductos()
    showToast('Producto eliminado.')
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo eliminar el producto.', 'error')
  }
}

async function cambiarEstado(id, estado) {
  try {
    await pedidosApi.cambiarEstado(id, estado)
    await cargarPedidos()
    selectedOrderId.value = id
    showToast('Estado actualizado.')
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo actualizar el estado.', 'error')
  }
}

async function marcarLeido(mensaje) {
  if (mensaje.leido) return
  try {
    await mensajesApi.marcarLeido(mensaje.id)
    mensaje.leido = true
    showToast('Mensaje marcado como leido.')
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo actualizar el mensaje.', 'error')
  }
}

async function marcarRespondido(mensaje) {
  try {
    await mensajesApi.marcarRespondido(mensaje.id)
    mensaje.respondido = true
    mensaje.leido = true
    showToast('Mensaje marcado como respondido.')
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo actualizar el mensaje.', 'error')
  }
}

async function guardarStockRapido(producto) {
  const nextStock = Number(stockDrafts.value[producto.id])
  if (!Number.isInteger(nextStock) || nextStock < 0) {
    showToast('El stock debe ser un numero entero mayor o igual a 0.', 'error')
    stockDrafts.value[producto.id] = Number(producto.stock || 0)
    return
  }

  savingStockId.value = producto.id
  try {
    await productosApi.actualizarStock(producto.id, nextStock)
    producto.stock = nextStock
    stockDrafts.value[producto.id] = nextStock
    showToast(`Stock actualizado para ${producto.nombre}.`)
  } catch (err) {
    stockDrafts.value[producto.id] = Number(producto.stock || 0)
    showToast(err.response?.data?.error || 'No se pudo actualizar el stock.', 'error')
  } finally {
    savingStockId.value = null
  }
}

function resetNewsletterForm() {
  newsletterForm.value = {
    subject: '',
    headline: '',
    previewText: '',
    body: '',
    ctaLabel: 'Ver catalogo',
    ctaUrl: 'http://localhost:5173/catalogo',
  }
}

async function enviarNewsletter() {
  if (!newsletterForm.value.subject || !newsletterForm.value.headline || !newsletterForm.value.body) {
    showToast('Asunto, titular y contenido son obligatorios.', 'error')
    return
  }

  sendingNewsletter.value = true
  try {
    const { data } = await mensajesApi.enviarNewsletter(newsletterForm.value)
    showToast(`Newsletter enviado a ${data.sent || 0} suscriptoras.`)
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo enviar el newsletter.', 'error')
  } finally {
    sendingNewsletter.value = false
  }
}

async function cargarHomeSettings() {
  const { data } = await settingsApi.site()
  siteSettings.value = data || siteSettings.value
}

async function guardarSiteSettings() {
  savingSiteSettings.value = true
  try {
    const { data } = await settingsApi.guardarSite(siteSettings.value)
    siteSettings.value = data.site
    showToast('Contenido del sitio actualizado correctamente.')
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo guardar el contenido del sitio.', 'error')
  } finally {
    savingSiteSettings.value = false
  }
}

async function handleHomeImagePicked(index, event) {
  const file = event.target.files?.[0]
  if (!file) return
  uploadingHomeIndex.value = index
  try {
    const { data } = await productosApi.subirImagen(file)
    siteSettings.value.home.categoryTiles[index].image_url = data.image_url
    showToast('Imagen de portada subida correctamente.')
  } catch (err) {
    showToast(err.response?.data?.error || 'No se pudo subir la imagen de portada.', 'error')
  } finally {
    uploadingHomeIndex.value = null
    event.target.value = ''
  }
}

async function cargarProductos() {
  const { data } = await productosApi.listarAdmin()
  productos.value = data
  syncStockDrafts()
}

async function cargarPedidos() {
  const { data } = await pedidosApi.listar()
  pedidos.value = data
  if (!selectedOrderId.value && data.length > 0) selectedOrderId.value = data[0].id
}

async function cargarStats() {
  const { data } = await pedidosApi.stats()
  stats.value = data
}

async function cargarClientesYMensajes() {
  const [clientesRes, mensajesRes, suscriptoresRes] = await Promise.all([
    clientesApi.listar(),
    mensajesApi.listar(),
    mensajesApi.listarSuscriptores(),
  ])
  clientes.value = clientesRes.data
  mensajes.value = mensajesRes.data
  suscriptores.value = suscriptoresRes.data
}

async function refreshAll() {
  refreshing.value = true
  error.value = ''
  try {
    await Promise.all([cargarProductos(), cargarPedidos(), cargarStats(), cargarClientesYMensajes(), cargarHomeSettings()])
    lastSync.value = new Date()
  } catch (err) {
    error.value = err.response?.data?.error || 'No se pudieron cargar los datos.'
  } finally {
    refreshing.value = false
    loading.value = false
  }
}

onMounted(async () => {
  resetForm()
  await refreshAll()
})

function fmt(n) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '-'
}

function formatDateTime(value) {
  return value
    ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '-'
}

function estadoLabel(estado) {
  return {
    pending_payment: 'Esperando transferencia',
    payment_submitted: 'Comprobante recibido',
    paid: 'Pago validado',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  }[estado] || estado
}

function tipoLabel(tipo) {
  return {
    consult: 'Consulta',
    order: 'Pedido',
    complaint: 'Reclamo',
  }[tipo] || tipo
}

function badgeLabel(badge) {
  return {
    hot: 'Mas vendido',
    new: 'Nuevo',
    sale: 'Oferta',
    '': '-',
  }[badge || '']
}

function stockClass(stock) {
  return stock === 0 ? 'stock-zero' : stock <= 5 ? 'stock-warn' : 'stock-ok'
}

function stockLabel(stock) {
  return stock === 0 ? 'Sin stock' : stock <= 5 ? `Bajo (${stock})` : stock
}
</script>

<style scoped>
.admin-layout { display: flex; height: 100vh; background: var(--ad-bg); font-family: 'DM Sans', sans-serif; }
.sidebar { width: 232px; background: #09070f; border-right: 1px solid var(--ad-border); display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-logo { padding: 28px 24px 24px; border-bottom: 1px solid var(--ad-border); }
.sidebar-logo-text { font-family: 'Cormorant Garamond', serif; font-size: 20px; font-weight: 300; letter-spacing: .15em; color: var(--blush); display: block; }
.sidebar-badge { display: inline-block; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; background: rgba(196,100,122,.2); color: #d4849a; padding: 3px 8px; border-radius: 3px; margin-top: 6px; }
.sidebar-nav { padding: 16px 0; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 24px; font-size: 13px; color: var(--ad-muted); cursor: pointer; border: none; border-left: 2px solid transparent; transition: all .2s; background: transparent; text-align: left; }
.nav-item:hover { color: var(--ad-text); background: rgba(255,255,255,.03); }
.nav-item.active { color: var(--blush); background: rgba(196,100,122,.08); border-left-color: var(--rose); }
.nav-icon { font-size: 16px; width: 20px; text-align: center; }
.sidebar-footer { padding: 20px 24px; border-top: 1px solid var(--ad-border); display: flex; flex-direction: column; gap: 8px; }
.exit-btn { font-size: 12px; color: var(--ad-muted); display: block; transition: color .2s; }
.exit-btn:hover { color: var(--blush); }
.logout-btn { background: none; border: 1px solid var(--ad-border); color: var(--ad-muted); padding: 8px; border-radius: 6px; font-size: 11px; transition: all .2s; }
.logout-btn:hover { color: #e57373; border-color: rgba(229,115,115,.4); }

.admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.admin-topbar { background: var(--ad-surface); border-bottom: 1px solid var(--ad-border); padding: 0 32px; min-height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-shrink: 0; }
.topbar-title { font-size: 16px; font-weight: 600; color: var(--ad-text); }
.topbar-subtitle { font-size: 12px; color: var(--ad-muted); margin-top: 2px; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.topbar-user { font-size: 12px; color: var(--ad-muted); }
.avatar { width: 32px; height: 32px; background: rgba(196,100,122,.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--blush); font-weight: 500; }
.admin-content { flex: 1; overflow-y: auto; padding: 32px; }

.status-chip { display: inline-flex; align-items: center; padding: 5px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.status-ok { background: rgba(111,207,151,.15); color: #6fcf97; }
.status-loading { background: rgba(240,180,50,.15); color: #f0b432; }
.status-error { background: rgba(229,115,115,.15); color: #e57373; max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.toast { position: sticky; top: 0; z-index: 5; margin-bottom: 20px; padding: 12px 16px; border-radius: 10px; font-size: 13px; border: 1px solid transparent; }
.toast-ok { background: rgba(111,207,151,.12); color: #89dfac; border-color: rgba(111,207,151,.25); }
.toast-error { background: rgba(229,115,115,.12); color: #f1a2a2; border-color: rgba(229,115,115,.25); }

.loading-shell { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.skeleton-card { height: 120px; border-radius: 12px; background: linear-gradient(90deg, rgba(255,255,255,.03), rgba(255,255,255,.08), rgba(255,255,255,.03)); animation: pulse 1.6s infinite linear; }
@keyframes pulse { 0% { background-position: 0 0; } 100% { background-position: 320px 0; } }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
.stat-card { background: var(--ad-surface); border: 1px solid var(--ad-border); border-radius: 10px; padding: 20px 24px; }
.stat-label { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ad-muted); margin-bottom: 10px; }
.stat-value { font-size: 26px; font-weight: 600; color: var(--ad-text); margin-bottom: 4px; }
.stat-change { font-size: 11px; color: var(--ad-muted); }
.up { color: #6fcf97; }
.down { color: #e57373; }

.dash-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 20px; margin-bottom: 20px; }
.newsletter-grid { align-items: start; }
.home-settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; margin-top: 18px; }
.settings-subblock { border-top: 1px solid rgba(255,255,255,.06); margin-top: 16px; padding-top: 16px; }
.home-tile-card { display: flex; flex-direction: column; gap: 14px; }
.home-image-preview img { max-height: 180px; object-fit: contain; background: #fff; }
.ad-card { background: var(--ad-surface); border: 1px solid var(--ad-border); border-radius: 10px; padding: 24px; }
.ad-card-title { font-size: 13px; font-weight: 600; color: var(--ad-text); margin-bottom: 20px; }
.newsletter-list-header { padding: 24px 24px 0; }
.detail-card { margin-top: 20px; }
.detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.detail-subtitle { color: var(--ad-muted); font-size: 12px; }
.detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.detail-label { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ad-muted); margin-bottom: 6px; }
.order-items { display: flex; flex-direction: column; gap: 10px; }
.order-item-row { display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid var(--ad-border); padding-top: 10px; color: var(--ad-text); font-size: 13px; }
.order-notes { margin-top: 18px; border-top: 1px solid var(--ad-border); padding-top: 16px; color: var(--ad-muted); }

.recent-order { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--ad-border); background: transparent; border-left: none; border-right: none; border-top: none; text-align: left; }
.recent-order:last-child { border-bottom: none; }
.recent-order-right { text-align: right; }
.order-code { font-size: 12px; color: var(--ad-muted); }
.order-name { font-size: 13px; color: var(--ad-text); }
.order-amt { font-size: 13px; font-weight: 600; color: var(--blush); }
.stock-alert-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--ad-border); }
.stock-alert-item:last-child { border-bottom: none; }
.sa-brand { font-size: 10px; color: var(--rose); letter-spacing: .1em; text-transform: uppercase; }
.sa-name { font-size: 13px; color: var(--ad-text); }

.section-actions { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.section-h2 { font-size: 16px; font-weight: 600; color: var(--ad-text); }
.section-copy { color: var(--ad-muted); font-size: 12px; margin-top: 2px; }
.actions-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.toolbar-input, .toolbar-select { background: var(--ad-surface); border: 1px solid var(--ad-border); color: var(--ad-text); border-radius: 8px; padding: 10px 12px; font-size: 12px; min-width: 180px; }
.toggle-row { display: inline-flex; align-items: center; gap: 8px; color: var(--ad-muted); font-size: 12px; }

.summary-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.summary-pill { background: rgba(255,255,255,.03); color: var(--ad-muted); border: 1px solid var(--ad-border); border-radius: 999px; padding: 8px 12px; font-size: 12px; }

.table-card { padding: 0; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ad-muted); font-weight: 600; text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--ad-border); }
td { font-size: 13px; color: var(--ad-text); padding: 12px 16px; border-bottom: 1px solid rgba(46,43,61,.5); }
tbody tr:hover td { background: rgba(255,255,255,.015); }
.row-active td { background: rgba(196,100,122,.06); }
.td-name { max-width: 260px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.td-price { font-weight: 600; color: var(--blush); }
.td-code { color: var(--blush); font-weight: 600; }
.td-bold { font-weight: 600; }
.td-actions { display: flex; gap: 8px; }
.product-thumb {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255,255,255,.04);
  border: 1px solid var(--ad-border);
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.product-thumb.empty span {
  font-size: 9px;
  color: var(--ad-muted);
  text-align: center;
  line-height: 1.2;
  padding: 4px;
}
.muted { color: var(--ad-muted) !important; font-size: 12px; }
.d-block { display: block; }
.table-empty { text-align: center; }

.stock-pill { display: inline-block; font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px; }
.stock-ok { background: rgba(111,207,151,.15); color: #6fcf97; }
.stock-warn { background: rgba(240,180,50,.15); color: #f0b432; }
.stock-zero { background: rgba(229,115,115,.15); color: #e57373; }
.stock-editor { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stock-input {
  width: 72px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--ad-border);
  background: rgba(255,255,255,.03);
  color: var(--ad-text);
  font-size: 12px;
}
.btn-stock {
  border: 1px solid rgba(157,184,163,.35);
  background: rgba(157,184,163,.12);
  color: #cbe1d1;
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 6px;
}
.btn-stock:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.status-pill { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 999px; }
.s-pending_payment { background: rgba(240,180,50,.15); color: #f0b432; }
.s-payment_submitted { background: rgba(196,100,122,.16); color: #f2a1ba; }
.s-paid { background: rgba(111,207,151,.15); color: #6fcf97; }
.s-shipped { background: rgba(111,207,151,.15); color: #6fcf97; }
.s-delivered { background: rgba(157,184,163,.2); color: #9db8a3; }
.s-cancelled { background: rgba(229,115,115,.15); color: #e57373; }

.skin-pill { font-size: 11px; background: rgba(196,100,122,.1); color: var(--blush); padding: 3px 8px; border-radius: 999px; }
.estado-select { background: var(--ad-bg); color: var(--ad-text); border: 1px solid var(--ad-border); border-radius: 4px; padding: 5px 10px; font-size: 12px; }

.btn-primary { padding: 9px 18px; background: var(--rose); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; transition: background .2s; }
.btn-primary:hover:not(:disabled) { background: var(--rose-dark); }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }
.btn-ghost { padding: 9px 18px; background: transparent; color: var(--ad-muted); border: 1px solid var(--ad-border); border-radius: 8px; font-size: 12px; transition: all .2s; }
.btn-ghost:hover { color: var(--ad-text); }
.btn-edit { background: rgba(196,100,122,.15); color: var(--blush); border: none; font-size: 11px; padding: 6px 12px; border-radius: 6px; transition: background .2s; }
.btn-edit:hover { background: rgba(196,100,122,.3); }
.btn-delete { background: transparent; color: #e57373; border: 1px solid rgba(229,115,115,.3); font-size: 11px; padding: 6px 12px; border-radius: 6px; transition: all .2s; }
.btn-delete:hover { background: rgba(229,115,115,.1); }
.btn-secondary { background: rgba(255,255,255,.04); color: var(--ad-muted); }

.unread-badge { font-size: 11px; background: rgba(196,100,122,.2); color: var(--blush); padding: 4px 10px; border-radius: 20px; font-weight: 600; }
.messages-list { display: flex; flex-direction: column; gap: 10px; }
.msg-item { background: var(--ad-surface); border: 1px solid var(--ad-border); border-radius: 8px; padding: 16px; transition: border-color .2s; }
.msg-item:hover { border-color: var(--rose); }
.msg-item.unread { border-left: 3px solid var(--rose); }
.msg-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; }
.msg-name { font-size: 13px; font-weight: 600; color: var(--ad-text); display: flex; align-items: center; gap: 6px; }
.unread-dot { width: 6px; height: 6px; background: var(--rose); border-radius: 50%; display: inline-block; }
.msg-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.msg-tag { font-size: 9px; padding: 2px 6px; border-radius: 999px; font-weight: 600; }
.mt-consult { background: rgba(196,100,122,.15); color: var(--blush); }
.mt-order { background: rgba(111,207,151,.15); color: #6fcf97; }
.mt-complaint { background: rgba(229,115,115,.15); color: #e57373; }
.msg-time { font-size: 11px; color: var(--ad-muted); }
.msg-preview { font-size: 12px; color: var(--ad-muted); margin-bottom: 10px; line-height: 1.5; }
.msg-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.msg-email { font-size: 11px; color: var(--ad-muted); }
.btn-respond { font-size: 11px; background: rgba(196,100,122,.1); color: var(--blush); border: none; padding: 6px 10px; border-radius: 6px; }
.responded-badge { font-size: 11px; color: #6fcf97; }

.empty-state { text-align: center; padding: 40px; color: var(--ad-muted); font-size: 13px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(4px); }
.modal { background: var(--ad-surface); border: 1px solid var(--ad-border); border-radius: 12px; padding: 32px; width: 100%; max-width: 620px; max-height: 85vh; overflow-y: auto; }
.modal-title { font-size: 18px; font-weight: 600; color: var(--ad-text); margin-bottom: 24px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ad-muted); margin-bottom: 7px; }
.label-hint { font-size: 10px; letter-spacing: 0; text-transform: none; color: rgba(122,117,144,.6); font-style: italic; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  background: var(--ad-bg);
  border: 1px solid var(--ad-border);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--ad-text);
  font-size: 13px;
  outline: none;
  transition: border-color .2s;
  font-family: 'DM Sans', sans-serif;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--rose); }
.form-group select option { background: var(--ad-bg); }
.input-readonly { opacity: .6; cursor: not-allowed; }
.upload-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.upload-row input[type="file"] { flex: 1; min-width: 240px; }
.image-preview {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--ad-border);
  border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.image-preview img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.image-preview span {
  font-size: 11px;
  color: var(--ad-muted);
  word-break: break-all;
}
.form-hint { font-size: 11px; color: var(--ad-muted); background: rgba(196,100,122,.08); border: 1px solid rgba(196,100,122,.15); border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
.form-hint strong { color: var(--blush); }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid var(--ad-border); margin-top: 8px; }

.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

@media (max-width: 1100px) {
  .stats-grid, .detail-grid, .dash-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 900px) {
  .admin-layout { flex-direction: column; height: auto; min-height: 100vh; }
  .sidebar { width: 100%; }
  .admin-topbar { padding: 16px 20px; align-items: flex-start; flex-direction: column; }
  .admin-content { padding: 20px; }
  .stats-grid, .detail-grid, .dash-grid, .form-row, .home-settings-grid { grid-template-columns: 1fr; }
  .section-actions { flex-direction: column; }
}
</style>
