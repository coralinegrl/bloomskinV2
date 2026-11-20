const DEFAULT_STORE_URL = 'https://bloomskin.cl';

function storeBaseUrl() {
  const candidate = process.env.STORE_BASE_URL || process.env.PUBLIC_APP_URL || DEFAULT_STORE_URL;
  try {
    const url = new URL(String(candidate).trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return DEFAULT_STORE_URL;
    if (process.env.NODE_ENV === 'production') {
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.port || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
          host.startsWith('[') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes('.')) return DEFAULT_STORE_URL;
    }
    return url.href.replace(/\/$/, '');
  } catch { return DEFAULT_STORE_URL; }
}

module.exports = { storeBaseUrl };
