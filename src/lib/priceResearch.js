/**
 * Fiyat araştırma altyapısı.
 *
 * 1) searchLinks: tarayıcıdan doğrudan kullanılabilen arama bağlantıları (her zaman çalışır).
 * 2) PRICE_PROVIDERS: otomatik fiyat çekme için sağlayıcı arayüzü. Tarayıcıdan üçüncü taraf sitelere
 *    doğrudan istek CORS nedeniyle engellenir; otomatik çekim için bir sunucu (proxy) veya resmî API
 *    anahtarı gerekir. Sağlayıcı `fetchPrices(query)` -> [{ price, unit, supplier, url, fetchedAt }]
 *    döndürmelidir. Dönen her sonuç kullanıcı onayı olmadan kataloğa yazılmaz.
 */

const enc = encodeURIComponent;

export const searchLinks = (name) => {
  const q = enc(name);
  return [
    { name: 'Google Alışveriş', url: `https://www.google.com/search?tbm=shop&q=${q}` },
    { name: 'Akakçe', url: `https://www.akakce.com/arama/?q=${q}` },
    { name: 'Trendyol', url: `https://www.trendyol.com/sr?q=${q}` },
    { name: 'Hepsiburada', url: `https://www.hepsiburada.com/ara?q=${q}` },
    { name: 'N11', url: `https://www.n11.com/arama?q=${q}` },
    { name: 'Sahibinden (2. el)', url: `https://www.sahibinden.com/arama?query_text=${q}` },
    { name: 'Alibaba (toptan)', url: `https://www.alibaba.com/trade/search?SearchText=${q}` },
  ];
};

export const PRICE_PROVIDERS = [
  {
    id: 'proxy',
    name: 'Kendi fiyat sunucunuz (proxy)',
    configured: false,
    async fetchPrices() {
      throw new Error('Otomatik fiyat çekme için bir sunucu uç noktası yapılandırılmadı.');
    },
  },
  {
    id: 'marketplace-api',
    name: 'Pazaryeri satıcı API’leri',
    configured: false,
    async fetchPrices() {
      throw new Error('Pazaryeri API anahtarı tanımlı değil.');
    },
  },
];
