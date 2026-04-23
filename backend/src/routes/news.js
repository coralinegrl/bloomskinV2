const router = require('express').Router();
const GoogleNewsDecoder = require('google-news-decoder');

const SOURCES = [
  {
    name: 'Korea JoongAng Daily',
    url: 'https://koreajoongangdaily.joins.com/section/industry',
    baseUrl: 'https://koreajoongangdaily.joins.com',
  },
  {
    name: 'The Korea Times',
    url: 'https://www.koreatimes.co.kr/business/companies',
    baseUrl: 'https://www.koreatimes.co.kr',
  },
];

const KEYWORDS = [
  'k-beauty',
  'beauty',
  'skincare',
  'skin care',
  'cosmetic',
  'cosmetics',
  'makeup',
  'sunscreen',
  'olive young',
  'serum',
  'moisturizer',
];

const CACHE_TTL_MS = 30 * 60 * 1000;
let cache = {
  expiresAt: 0,
  items: [],
};
const googleNewsDecoder = new GoogleNewsDecoder();

router.get('/kbeauty', async (_req, res) => {
  try {
    if (cache.items.length && cache.expiresAt > Date.now()) {
      return res.json({ updated_at: new Date(cache.expiresAt - CACHE_TTL_MS).toISOString(), items: cache.items });
    }

    const fetched = await Promise.all(SOURCES.map(fetchSourceArticles));
    let items = fetched
      .flat()
      .filter(Boolean)
      .filter(item => isRelevant(item.title))
      .filter(uniqueByUrl)
      .slice(0, 8);

    if (!items.length) {
      items = await fetchGoogleFallback();
    }

    cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      items,
    };

    res.json({ updated_at: new Date().toISOString(), items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron cargar las noticias de K-Beauty' });
  }
});

async function fetchSourceArticles(source) {
  const response = await fetch(source.url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BloomskinBot/1.0; +http://localhost)',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer ${source.name}: ${response.status}`);
  }

  const html = await response.text();
  const matches = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  return matches
    .map(match => normalizeArticle(match[1], match[2], source))
    .filter(Boolean)
    .slice(0, 12);
}

async function fetchGoogleFallback() {
  const query = encodeURIComponent('(K-beauty OR skincare OR cosmetics OR beauty) (site:koreajoongangdaily.joins.com OR site:koreatimes.co.kr OR site:en.sedaily.com)');
  const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BloomskinBot/1.0; +http://localhost)',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo leer el fallback de noticias: ${response.status}`);
  }

  const xml = await response.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map(match => {
      const itemXml = match[1];
      const title = decodeXml(extractTag(itemXml, 'title'));
      const link = decodeXml(extractTag(itemXml, 'link'));
      if (!title || !link) return null;

      const parts = title.split(' - ');
      const source = parts.length > 1 ? parts[parts.length - 1] : 'Fuente coreana';

      return {
        title: parts.slice(0, -1).join(' - ') || title,
        url: link,
        source,
      };
    })
    .filter(Boolean)
    .filter(item => isRelevant(item.title))
    .filter(uniqueByUrl)
    .slice(0, 8);

  const decodedItems = await Promise.all(items.map(decodeGoogleNewsItem));
  return decodedItems
    .filter(Boolean)
    .filter(item => isEligibleNewsItem(item))
    .filter(uniqueByUrl)
    .slice(0, 8);
}

async function decodeGoogleNewsItem(item) {
  if (!item?.url || !isGoogleNewsUrl(item.url)) {
    return item;
  }

  try {
    const decoded = await googleNewsDecoder.decodeGoogleNewsUrl(item.url);
    if (decoded?.status && decoded.decodedUrl && isEligibleArticleUrl(decoded.decodedUrl)) {
      return {
        ...item,
        url: decoded.decodedUrl,
      };
    }
  } catch (error) {
    console.warn(`No se pudo decodificar la URL de Google News: ${item.url}`, error.message);
  }

  return item;
}

function normalizeArticle(href, rawTitle, source) {
  const title = stripHtml(rawTitle).replace(/\s+/g, ' ').trim();
  if (!title || title.length < 18) return null;

  const url = toAbsoluteUrl(href, source.baseUrl);
  if (!url || !/^https?:\/\//.test(url)) return null;
  if (!isEligibleArticleUrl(url)) return null;

  return {
    title,
    url,
    source: source.name,
  };
}

function toAbsoluteUrl(href, baseUrl) {
  if (!href) return null;
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `${baseUrl}${href}`;
  return `${baseUrl}/${href.replace(/^\.?\//, '')}`;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? match[1] : '';
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function isGoogleNewsUrl(url) {
  return /https?:\/\/news\.google\.com\//i.test(url);
}

function isEligibleArticleUrl(url) {
  return !(
    url.includes('/photo') ||
    url.includes('/video') ||
    url.includes('/topic/') ||
    url.endsWith('.pdf')
  );
}

function isEligibleNewsItem(item) {
  if (!item?.title || !item?.url) return false;
  const title = item.title.toLowerCase();
  if (title.startsWith('topic:') || title.includes('[video]')) return false;
  if (isGoogleNewsUrl(item.url)) return false;
  return isEligibleArticleUrl(item.url);
}

function isRelevant(title) {
  const text = title.toLowerCase();
  return KEYWORDS.some(keyword => text.includes(keyword));
}

function uniqueByUrl(item, index, list) {
  return list.findIndex(entry => entry.url === item.url) === index;
}

module.exports = router;
