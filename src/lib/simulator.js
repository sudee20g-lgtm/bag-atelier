/**
 * İş Kurma ve Maliyet Simülatörü — veri tanımları ve hesap motoru.
 *
 * Her gider kalemi üç türden biridir:
 *   zorunlu  → seçim gerekmeden hesaba girer (neden zorunlu olduğu `reason` ile açıklanır)
 *   kosullu  → kullanıcının durumuna göre (`applies(cfg)`) hesaba girer
 *   istege   → yalnızca kullanıcı seçerse hesaba girer
 *
 * Kaynak etiketleri (src):
 *   resmi     → mevzuat parametresinden/formülden hesaplandı (parametre durumu ayrıca gösterilir)
 *   katalog   → malzeme kataloğundaki fiyattan (son kontrol tarihiyle)
 *   kullanici → kullanıcının girdiği kesin tutar (teklif/fatura)
 *   tahmini   → kullanıcının "tahmini" olarak işaretlediği tutar
 *   hesap     → diğer kalemlerden türetildi
 *   eksik     → seçili/zorunlu ama tutar girilmemiş
 */
import { n, uid, today } from './format.js';
import { param } from './calc.js';

export const KIND = {
  zorunlu: { label: 'Zorunlu', tone: 'danger' },
  kosullu: { label: 'Koşula bağlı', tone: 'warn' },
  istege: { label: 'İsteğe bağlı', tone: 'info' },
};
export const SRC = {
  resmi: { label: 'Resmî parametre', tone: 'ok' },
  katalog: { label: 'Katalog fiyatı', tone: 'brand' },
  kullanici: { label: 'Kullanıcı girişi', tone: 'muted' },
  tahmini: { label: 'Tahmini', tone: 'warn' },
  hesap: { label: 'Hesaplandı', tone: 'info' },
  eksik: { label: 'Tutar girilmedi', tone: 'danger' },
};
export const FREQ = { once: 'Tek seferlik', monthly: 'Aylık', yearly: 'Yıllık', perUnit: 'Adet başı', pct: '% oran' };

export const MODELS = [
  { id: 'kendim', label: 'Ürünleri kendim üreteceğim', desc: 'Makine, ekipman ve işçilik sizde. Malzeme alımı ve atölye düzeni gerekir.' },
  { id: 'atolye', label: 'Bir atölyeye ürettireceğim', desc: 'Numune, kalıp ve birim dikim ücreti ödersiniz; MOQ genelde düşüktür.' },
  { id: 'firma', label: 'Bir üretim firmasıyla çalışacağım', desc: 'Daha yüksek minimum sipariş, genelde malzeme dahil fiyat ve kurumsal süreç.' },
  { id: 'hibrit', label: 'Hem kendim üreteceğim hem dışarıya ürettireceğim', desc: 'Üretimin bir kısmı sizde, bir kısmı atölyede. Oranı siz belirlersiniz.' },
];
export const hasOwn = (cfg) => cfg.model === 'kendim' || cfg.model === 'hibrit';
export const hasOut = (cfg) => cfg.model !== 'kendim';
export const ownShare = (cfg) => (cfg.model === 'kendim' ? 1 : cfg.model === 'hibrit' ? Math.min(1, Math.max(0, n(cfg.hybridOwnPct) / 100)) : 0);

export const COMPANY = [
  { id: 'sahis', label: 'Şahıs şirketi' },
  { id: 'limited', label: 'Limited şirket' },
  { id: 'anonim', label: 'Anonim şirket' },
];
export const EMPLOYMENT = [
  { id: 'yok', label: 'Başka bir yerde sigortalı değilim', hint: 'Kendi işiniz için 4/b (Bağ-Kur) kaydı açılır.' },
  { id: '4a', label: 'Başka bir işte 4/a (SGK’lı) çalışıyorum', hint: 'Çakışan sigortalılıkta kural olarak 4/a esas alınır; ayrıca değerlendirilmeli.' },
  { id: 'emekli', label: 'Emekliyim', hint: 'Emekliler için Sosyal Güvenlik Destek Primi (SGDP) gündeme gelebilir.' },
];
const isLtdAs = (c) => c.company.type !== 'sahis';
const online = (c) => c.brand.channels.web || c.brand.channels.pazaryeri || c.brand.channels.sosyal;

/* ---------------- Kalem tanımları ---------------- */
export const SETUP_ITEMS = [
  { key: 'mm_kurulus', label: 'Mali müşavir kuruluş işlemleri', kind: 'zorunlu', freq: 'once',
    reason: 'Vergi dairesi/MERSİS kaydı, defter açılışı ve kuruluş evrakı. Yasal olarak kendiniz de yürütebilirsiniz; ancak defter ve beyanname yükümlülükleri nedeniyle uygulamada zorunlu kabul edilir.' },
  { key: 'noter', label: 'Noter ve imza işlemleri', kind: 'zorunlu', freq: 'once',
    reason: 'Ltd/AŞ’de müdür/yönetici imza beyannamesi; şahıs işletmesinde tacir kaydı için imza beyannamesi istenir. Ücret noterlik tarifesine bağlıdır.' },
  { key: 'sicil_oda', label: 'Ticaret sicili ve oda kayıt masrafları', kind: 'zorunlu', freq: 'once',
    reason: 'Her işletme bir meslek odasına kayıt olmak zorundadır (5174 s. Kanun / 5362 s. Kanun). Şahıs işletmesinde esnaf veya tacir olmanıza göre oda değişir.' },
  { key: 'ttsg', label: 'Ticaret Sicil Gazetesi ilan ücreti', kind: 'kosullu', freq: 'once', applies: isLtdAs, cond: 'Limited ve anonim şirketlerde',
    reason: 'Ltd/AŞ kuruluşu Ticaret Sicil Gazetesi’nde ilan edilir; ücret ilan metninin uzunluğuna göre hesaplanır.' },
  { key: 'rekabet', label: 'Rekabet Kurumu payı', kind: 'kosullu', freq: 'once', applies: isLtdAs, cond: 'Limited ve anonim şirketlerde', auto: 'rekabet',
    reason: 'Kuruluşta sermayenin on binde dördü (‰0,4) Rekabet Kurumu hesabına yatırılır (4054 s. Kanun md. 39).' },
  { key: 'eimza', label: 'E-imza', kind: 'zorunlu', freq: 'once',
    reason: 'MERSİS başvurusu, e-arşiv/e-fatura ve resmî portallar için nitelikli elektronik sertifika gerekir.' },
  { key: 'vergi_resmi', label: 'Vergi ve diğer resmî işlemler', kind: 'zorunlu', freq: 'once',
    reason: 'Defter tasdiki, harçlar ve kuruluş sırasındaki diğer resmî ücretler.' },
  { key: 'diger_kurulus', label: 'Gerekli diğer kuruluş giderleri', kind: 'istege', freq: 'once',
    reason: 'Kaşe, adres/sanal ofis sözleşmesi, tabela vb. ihtiyaca göre.' },
];

export const RECURRING_ITEMS = [
  { key: 'mm_aylik', label: 'Mali müşavir ücreti', kind: 'zorunlu', freq: 'monthly',
    reason: 'Aylık/üç aylık beyannameler, defter kayıtları ve bildirimler. Uygulamada zorunlu kabul edilir.' },
  { key: 'beyanname', label: 'Muhasebe ve beyanname giderleri', kind: 'zorunlu', freq: 'monthly',
    reason: 'Beyannamelerde damga vergisi ödenir ve tutarı her yıl güncellenir. Mali müşavir ücretine dahilse 0 bırakın; aynı gideri iki kez girmeyin.' },
  { key: 'bagkur', label: 'SGK / Bağ-Kur yükümlülükleri', kind: 'kosullu', freq: 'monthly', auto: 'bagkur', cond: 'Sigortalılık durumunuza göre',
    reason: 'Şahıs işletmesi sahipleri, Ltd ortakları ve AŞ yönetim kurulu üyesi ortaklar 4/b kapsamında değerlendirilir. Başka statüde sigortalılık varsa durum değişir.' },
  { key: 'efatura', label: 'E-fatura ve e-arşiv hizmetleri', kind: 'kosullu', freq: 'yearly', applies: (c) => online(c) || isLtdAs(c), cond: 'İnternetten satış veya Ltd/AŞ',
    reason: 'İnternet üzerinden satış yapanlar hasılat eşiğine göre e-arşiv/e-fatura’ya geçmek zorundadır (eşiği GİB’den kontrol edin). GİB portalı ücretsizdir; özel entegratör ücretlidir.' },
  { key: 'eimza_yenileme', label: 'E-imza / mali mühür yenileme', kind: 'zorunlu', freq: 'yearly',
    reason: 'Sertifikalar süreli olduğundan geçerlilik bitince yenilenir.' },
  { key: 'oda_aidat', label: 'Oda yıllık aidatı', kind: 'zorunlu', freq: 'yearly', reason: 'Oda üyeliği sürdükçe yıllık aidat ödenir.' },
  { key: 'muh_yazilim', label: 'Muhasebe / ön muhasebe yazılımı', kind: 'istege', freq: 'monthly', reason: 'Stok, fatura ve cari takibi için tercihe bağlı.' },
  { key: 'diger_yuk', label: 'Diğer zorunlu yükümlülükler (varsa)', kind: 'kosullu', freq: 'monthly', applies: () => true, cond: 'Varsa girin',
    reason: 'Ruhsat harcı, çevre temizlik vergisi vb. işletmenize özgü yükümlülükler.' },
];

export const MACHINES = [
  { key: 'ev', label: 'Ev tipi dikiş makinesi', watt: 100 },
  { key: 'heavy', label: 'Heavy Duty dikiş makinesi', watt: 120 },
  { key: 'sanayi', label: 'Sanayi tipi düz dikiş makinesi', watt: 550 },
  { key: 'canta', label: 'Çanta dikim makinesi (kollu/silindir)', watt: 550 },
  { key: 'cift', label: 'Çift transportlu makine', watt: 550 },
  { key: 'overlok', label: 'Overlok makinesi', watt: 400 },
];
export const EXTRAS = [
  ['kesim_masasi', 'Kesim masası'], ['makas', 'Kumaş makası'], ['doner', 'Döner kesici'], ['cetvel', 'Cetvel ve ölçüm araçları'],
  ['utu', 'Ütü'], ['buhar', 'Buhar ekipmanı'], ['zimba', 'Zımba ve perçin ekipmanları'], ['kalip', 'Çanta kalıbı ve şablonlar'],
  ['delgec', 'Delgeç'], ['yapistirici', 'Yapıştırıcı ve uygulama aparatları'], ['baski', 'Baskı ve logo ekipmanları'], ['diger_arac', 'Diğer araçlar'],
].map(([key, label]) => ({ key, label }));

export const BRAND_ITEMS = [
  { key: 'marka_tescil', label: 'Marka tescili', kind: 'istege', freq: 'once', reason: 'Yasal zorunluluk değildir ama markanızı korumak için güçlü şekilde önerilir (TÜRKPATENT, sınıf 18).' },
  { key: 'logo', label: 'Logo tasarımı', kind: 'istege', freq: 'once' },
  { key: 'alan_adi', label: 'Alan adı', kind: 'kosullu', freq: 'yearly', applies: (c) => c.brand.channels.web, cond: 'Kendi web sitenizden satış' },
  { key: 'web_kurulum', label: 'Web sitesi kurulumu / tasarımı', kind: 'kosullu', freq: 'once', applies: (c) => c.brand.channels.web, cond: 'Kendi web sitenizden satış' },
  { key: 'hosting', label: 'Hosting', kind: 'kosullu', freq: 'monthly', applies: (c) => c.brand.channels.web, cond: 'Kendi web sitenizden satış',
    reason: 'Hazır e-ticaret platformu kullanıyorsanız barındırma pakete dahildir; 0 bırakın ki iki kez sayılmasın.' },
  { key: 'eticaret', label: 'E-ticaret altyapısı (abonelik)', kind: 'kosullu', freq: 'monthly', applies: (c) => c.brand.channels.web, cond: 'Kendi web sitenizden satış' },
  { key: 'urun_foto', label: 'Profesyonel ürün fotoğraf çekimi', kind: 'istege', freq: 'once' },
  { key: 'ambalaj_tasarim', label: 'Ambalaj tasarımı', kind: 'istege', freq: 'once' },
  { key: 'pazaryeri_uyelik', label: 'Pazaryeri üyelik / mağaza ücreti', kind: 'kosullu', freq: 'monthly', applies: (c) => c.brand.channels.pazaryeri, cond: 'Pazaryerinden satış' },
];

export const MARKETING_ITEMS = [
  { key: 'instagram', label: 'Instagram reklamı', kind: 'istege', freq: 'monthly' },
  { key: 'tiktok', label: 'TikTok reklamı', kind: 'istege', freq: 'monthly' },
  { key: 'influencer', label: 'Influencer iş birliği', kind: 'istege', freq: 'monthly' },
  { key: 'video', label: 'Video çekimi', kind: 'istege', freq: 'once' },
  { key: 'sosyal_tasarim', label: 'Sosyal medya tasarımı / yönetimi', kind: 'istege', freq: 'monthly' },
  { key: 'lansman', label: 'Lansman kampanyası', kind: 'istege', freq: 'once' },
];

export const WORKSPACES = [
  { id: 'ev', label: 'Evden çalışacağım', desc: 'Kira yok. Yalnızca işe bağlı ek elektrik vb. giderler hesaplanır.' },
  { id: 'atolye', label: 'Küçük bir atölye kiralayacağım', desc: 'Kira, depozito, elektrik ve internet gibi giderler eklenir.' },
  { id: 'ortak', label: 'Ortak üretim alanı kullanacağım', desc: 'Aylık üyelik ücreti; çoğu gider pakete dahildir.' },
];
export const WORKSPACE_ITEMS = {
  ev: [
    { key: 'elektrik', label: 'İşe bağlı ek elektrik', kind: 'zorunlu', freq: 'monthly', reason: 'Makine, ütü ve aydınlatmanın faturanıza eklediği tüketim. Birim maliyete ayrıca eklenmez; burada aylık olarak tek kez sayılır.' },
    { key: 'internet', label: 'Ek internet gideri', kind: 'istege', freq: 'monthly', reason: 'Mevcut ev internetinizi kullanıyorsanız ek gider yoktur.' },
    { key: 'depolama', label: 'Depolama', kind: 'istege', freq: 'monthly' },
    { key: 'bakim', label: 'Bakım ve diğer', kind: 'istege', freq: 'monthly' },
  ],
  atolye: [
    { key: 'kira', label: 'Atölye kirası', kind: 'zorunlu', freq: 'monthly', reason: 'Atölye kiralamayı seçtiniz.' },
    { key: 'depozito', label: 'Depozito ve emlak komisyonu', kind: 'zorunlu', freq: 'once', reason: 'Kiralamada genelde depozito ve komisyon tek seferlik ödenir. Yoksa 0 girin.' },
    { key: 'aidat', label: 'Aidat', kind: 'istege', freq: 'monthly' },
    { key: 'elektrik', label: 'Elektrik', kind: 'zorunlu', freq: 'monthly', reason: 'Atölyenin tüm elektrik tüketimi. Birim maliyete ayrıca eklenmez.' },
    { key: 'internet', label: 'İnternet', kind: 'zorunlu', freq: 'monthly', reason: 'Sipariş ve satış yönetimi için gerekir.' },
    { key: 'depolama', label: 'Depolama', kind: 'istege', freq: 'monthly' },
    { key: 'bakim', label: 'Atölye bakım ve temizlik', kind: 'istege', freq: 'monthly' },
    { key: 'tadilat', label: 'Tadilat / kurulum', kind: 'istege', freq: 'once' },
  ],
  ortak: [
    { key: 'uyelik', label: 'Ortak alan üyelik ücreti', kind: 'zorunlu', freq: 'monthly', reason: 'Ortak üretim alanını seçtiniz.' },
    { key: 'elektrik', label: 'Elektrik (pakete dahil değilse)', kind: 'istege', freq: 'monthly' },
    { key: 'internet', label: 'İnternet (pakete dahil değilse)', kind: 'istege', freq: 'monthly' },
    { key: 'depolama', label: 'Depolama', kind: 'istege', freq: 'monthly' },
  ],
};

/* ---------------- Varsayılan yapılandırma ---------------- */
const amt = (selected = false) => ({ selected, amount: 0, est: false });
const mapItems = (list, sel = false) => Object.fromEntries(list.map((x) => [x.key, amt(sel)]));

export const defaultConfig = () => ({
  model: 'kendim',
  hybridOwnPct: 50,
  company: {
    type: 'sahis', employment: 'yok', registry: 'esnaf', age: null, firstTime: true, capital: 50000,
    bagkurBase: null, bagkurDiscount: true, sgdp: 0,
    setup: mapItems(SETUP_ITEMS), recurring: mapItems(RECURRING_ITEMS),
  },
  production: {
    noMachine: false,
    machines: Object.fromEntries(MACHINES.map((m) => [m.key, { selected: false, brand: '', model: '', condition: 'sifir', price: 0, warranty: '', maintenanceYearly: 0, est: false }])),
    extras: mapItems(EXTRAS),
    laborHours: 3, hourlyRate: 0, includeLabor: true, laborIsCash: false, amortUnits: 500,
  },
  recipe: [],
  packaging: [],
  fason: {
    workshop: '', sampleFee: 0, patternFee: 0, unitSewing: 0, materialsBy: 'ben', moq: 0, qty: 100,
    packagingPerUnit: 0, packagingByWorkshop: false, shippingTotal: 0, qcPerUnit: 0, leadDays: 0, est: false,
  },
  brand: {
    channels: { web: false, pazaryeri: true, sosyal: true },
    share: { web: 0, pazaryeri: 60, sosyal: 40 },
    items: mapItems(BRAND_ITEMS),
    mpPct: 0, payPct: 0, socialPayPct: 0, shippingPerOrder: 0, shippingByCustomer: false,
  },
  marketing: { items: mapItems(MARKETING_ITEMS) },
  workspace: { type: 'ev', items: Object.fromEntries(Object.entries(WORKSPACE_ITEMS).map(([k, l]) => [k, mapItems(l)])) },
  target: {
    models: 3, perModel: 10, monthlySales: 20, avgPrice: 0, budget: 0,
    monthsToFirstSale: 2, reserveMonths: 3, targetMargin: 25, taxPct: 20, returnPct: 5, otherVarPerUnit: 0, kdv: 20, otherStartup: 0,
  },
});

export const defaultSim = () => ({
  active: 'dengeli',
  name: 'Yeni simülasyon',
  savedId: '',
  scenarios: { ekonomik: null, dengeli: defaultConfig(), profesyonel: null },
});

/* Eski kayıtlarda eksik alanları tamamlar */
export function normalizeConfig(cfg) {
  const base = defaultConfig();
  const deep = (b, v) => {
    if (v === undefined || v === null) return b;
    if (Array.isArray(b) || typeof b !== 'object' || b === null) return v;
    const out = { ...b };
    Object.keys(v).forEach((k) => (out[k] = k in b ? deep(b[k], v[k]) : v[k]));
    return out;
  };
  return deep(base, cfg);
}

export const SCENARIOS = [
  { id: 'ekonomik', label: 'Ekonomik başlangıç', desc: 'Evden üretim, yalnızca temel ekipman, küçük ilk stok, düşük reklam.' },
  { id: 'dengeli', label: 'Dengeli başlangıç', desc: 'Sizin seçimleriniz.' },
  { id: 'profesyonel', label: 'Profesyonel başlangıç', desc: 'Kiralık atölye, gelişmiş makine, tüm ekipman, büyük stok ve reklam.' },
];

const ESSENTIAL_EXTRAS = ['makas', 'cetvel', 'utu', 'kalip'];

/** Dengeli senaryodan ekonomik / profesyonel taslak üretir. Tutarları uydurmaz: yeni seçilen kalemlerin tutarı 0 ise "Tutar girilmedi" olarak işaretlenir. */
export function deriveScenario(base, kind) {
  const c = structuredClone(base);
  if (kind === 'ekonomik') {
    c.workspace.type = 'ev';
    const ms = Object.entries(c.production.machines).filter(([, m]) => m.selected);
    const keep = ms.find(([k]) => k === 'ev') || ms.find(([k]) => k === 'heavy') || ms.sort((a, b) => n(a[1].price) - n(b[1].price))[0];
    Object.entries(c.production.machines).forEach(([k, m]) => (m.selected = keep ? k === keep[0] : false));
    Object.entries(c.production.extras).forEach(([k, e]) => (e.selected = e.selected && ESSENTIAL_EXTRAS.includes(k)));
    ['logo', 'urun_foto', 'ambalaj_tasarim'].forEach((k) => (c.brand.items[k].selected = false));
    Object.entries(c.marketing.items).forEach(([k, m]) => {
      const def = MARKETING_ITEMS.find((x) => x.key === k);
      if (def.freq === 'once') m.selected = false;
      else m.amount = Math.round(n(m.amount) * 0.5);
    });
    c.target.models = Math.max(1, Math.min(n(c.target.models), 2));
    c.target.perModel = Math.max(5, Math.round(n(c.target.perModel) * 0.5));
  }
  if (kind === 'profesyonel') {
    c.workspace.type = 'atolye';
    if (hasOwn(c)) {
      c.production.noMachine = false;
      ['sanayi', 'canta'].forEach((k) => (c.production.machines[k].selected = true));
      Object.values(c.production.extras).forEach((e) => (e.selected = true));
    }
    Object.values(c.brand.items).forEach((i) => (i.selected = true));
    Object.values(c.marketing.items).forEach((m) => {
      m.selected = true;
      m.amount = Math.round(n(m.amount) * 2);
    });
    c.target.perModel = Math.round(n(c.target.perModel) * 2);
  }
  return c;
}

/* ---------------- Hesap motoru ---------------- */
const monthlyOf = (freq, amount) => (freq === 'yearly' ? n(amount) / 12 : freq === 'monthly' ? n(amount) : 0);

function itemLine(def, v, cfg, extra = {}) {
  const applies = def.kind === 'zorunlu' || (def.kind === 'kosullu' ? (def.applies ? def.applies(cfg) : true) : !!v?.selected);
  const amount = n(v?.amount);
  const src = amount > 0 ? (v?.est ? 'tahmini' : 'kullanici') : 'eksik';
  return { key: def.key, label: def.label, kind: def.kind, freq: def.freq, reason: def.reason, applies, amount, src, ...extra };
}

/** Malzeme satın alma: ihtiyaç − stok; eksik varsa en az MOQ kadar alınır */
function purchaseLine(mat, qtyPerUnit, waste, units) {
  const need = n(qtyPerUnit) * (1 + n(waste) / 100) * units;
  const stock = n(mat?.stockQty);
  const short = Math.max(0, need - stock);
  const buy = short > 0 ? Math.max(short, n(mat?.moq)) : 0;
  const hasPrice = mat && mat.price !== null && mat.price !== '' && mat.price !== undefined;
  return { need, stock, buy, cost: hasPrice ? buy * n(mat.price) : 0, hasPrice };
}

export function bagkurMonthly(state, cfg) {
  const co = cfg.company;
  if (co.employment === '4a') return { amount: 0, note: '4/a sigortalılığınız devam ederken kural olarak 4/b primi ayrıca ödenmez (5510 md. 53). SGK ve mali müşavirinizle doğrulayın; 4/a sona ererse Bağ-Kur başlar.', src: 'hesap' };
  if (co.employment === 'emekli') {
    return { amount: n(co.sgdp), note: 'Emekliler için Sosyal Güvenlik Destek Primi (SGDP) uygulanabilir; oranı ve tutarı SGK’dan kontrol edip girin.', src: n(co.sgdp) > 0 ? 'kullanici' : 'eksik' };
  }
  const min = param(state, 'asgariBrut');
  const max = min * param(state, 'bagkurTavanKat');
  const base = Math.min(max, Math.max(min, n(co.bagkurBase) || min));
  const rate = param(state, 'bagkurOran') - (co.bagkurDiscount ? param(state, 'bagkurIndirim') : 0);
  return { amount: (base * rate) / 100, note: `Esas kazanç ${Math.round(base).toLocaleString('tr-TR')} ₺ × %${rate.toLocaleString('tr-TR')} (mevzuat parametrelerinden; doğrulanmalı).`, src: 'resmi', base, rate };
}

export function youngEntrepreneur(state, cfg) {
  const co = cfg.company;
  const reasons = [];
  if (co.type !== 'sahis') reasons.push('Yalnızca şahıs işletmeleri (gelir vergisi mükellefleri) yararlanabilir.');
  if (co.age === null || co.age === '' || co.age === undefined) reasons.push('Yaşınızı girin.');
  else if (n(co.age) < 18 || n(co.age) >= 29) reasons.push('Mükellefiyet başlangıcında 18 yaşını doldurmuş, 29 yaşını doldurmamış olmak gerekir.');
  if (!co.firstTime) reasons.push('İlk kez vergi mükellefiyeti tesis ettiriyor olmanız gerekir.');
  const limit = param(state, 'gencGirisimciLimit');
  const p = state.params.find((x) => x.key === 'gencGirisimciLimit');
  return { eligible: reasons.length === 0, reasons, limit, param: p };
}

export function fasonUnit(cfg, materialCost, packagingCost, qty) {
  const f = cfg.fason;
  const q = Math.max(1, n(qty));
  const perUnit = n(f.unitSewing) + n(f.qcPerUnit) + n(f.packagingPerUnit)
    + (f.materialsBy === 'ben' ? materialCost : 0)
    + (f.packagingByWorkshop ? 0 : packagingCost);
  const batch = n(f.shippingTotal) / q; // nakliye sipariş başınadır, adede bölünür
  const setupShare = (n(f.sampleFee) + n(f.patternFee)) / q; // bilgi: başlangıç yatırımında sayılır
  return { perUnit, batch, unit: perUnit + batch, setupShare, unitWithSetup: perUnit + batch + setupShare, total: (perUnit + batch) * q + n(f.sampleFee) + n(f.patternFee), belowMoq: q < n(f.moq) };
}

export function computeSim(state, cfgIn) {
  const cfg = normalizeConfig(cfgIn);
  const t = cfg.target;
  const warnings = [];
  const share = ownShare(cfg);
  const totalUnits = Math.max(0, n(t.models) * n(t.perModel));
  const ownUnits = Math.round(totalUnits * share);
  const outUnits = totalUnits - ownUnits;
  const mat = (id) => state.materials.find((m) => m.id === id);

  /* --- Birim malzeme ve ambalaj --- */
  const recipe = cfg.recipe.filter((l) => l.materialId).map((l) => {
    const m = mat(l.materialId);
    const hasPrice = m && m.price !== null && m.price !== '' && m.price !== undefined;
    const eff = n(l.qty) * (1 + n(l.waste) / 100);
    return { ...l, material: m, hasPrice, eff, unitCost: hasPrice ? eff * n(m.price) : 0 };
  });
  const pack = cfg.packaging.filter((l) => l.materialId).map((l) => {
    const m = mat(l.materialId);
    const hasPrice = m && m.price !== null && m.price !== '' && m.price !== undefined;
    return { ...l, waste: 0, material: m, hasPrice, eff: n(l.qty), unitCost: hasPrice ? n(l.qty) * n(m.price) : 0 };
  });
  const materialUnit = recipe.reduce((a, l) => a + l.unitCost, 0);
  const packagingUnit = pack.reduce((a, l) => a + l.unitCost, 0);
  const missingPrices = [...recipe, ...pack].filter((l) => !l.hasPrice).length;
  if (missingPrices) warnings.push(`${missingPrices} malzemenin fiyatı katalogda yok; malzeme maliyeti eksik hesaplanıyor.`);
  if (!recipe.length) warnings.push('Malzeme reçetesi boş: çanta başına malzeme maliyeti 0 görünüyor.');

  /* --- Birim üretim maliyeti --- */
  const p = cfg.production;
  const laborUnit = hasOwn(cfg) && p.includeLabor ? n(p.laborHours) * n(p.hourlyRate) : 0;
  const ownUnitCost = materialUnit + laborUnit + packagingUnit;
  const fasonQty = Math.max(1, outUnits);
  const fu = hasOut(cfg) ? fasonUnit(cfg, materialUnit, packagingUnit, fasonQty) : null;
  if (fu?.belowMoq) warnings.push(`Fason üretim adedi (${fasonQty}) atölyenin minimum sipariş miktarının (${cfg.fason.moq}) altında.`);

  // ağırlıklı birim (ambalaj dahil, kargo/komisyon hariç)
  const prodUnit = share * ownUnitCost + (1 - share) * (fu ? fu.unit : 0);
  const unitParts = {
    material: share * materialUnit + (1 - share) * (cfg.fason.materialsBy === 'ben' ? materialUnit : 0),
    labor: share * laborUnit,
    sewing: (1 - share) * (fu ? n(cfg.fason.unitSewing) + n(cfg.fason.qcPerUnit) + n(cfg.fason.packagingPerUnit) + fu.batch : 0),
    packaging: share * packagingUnit + (1 - share) * (cfg.fason.packagingByWorkshop ? 0 : packagingUnit),
  };
  // atölye malzemeyi sağlıyorsa malzeme dikim fiyatına dahildir
  /* --- Satış giderleri --- */
  const b = cfg.brand;
  const ch = b.channels;
  const shares = { web: ch.web ? n(b.share.web) : 0, pazaryeri: ch.pazaryeri ? n(b.share.pazaryeri) : 0, sosyal: ch.sosyal ? n(b.share.sosyal) : 0 };
  const shareSum = shares.web + shares.pazaryeri + shares.sosyal || 1;
  const commPct = (shares.pazaryeri * n(b.mpPct) + shares.web * n(b.payPct) + shares.sosyal * n(b.socialPayPct)) / shareSum / 100;
  if (Math.abs(shareSum - 100) > 0.5 && (ch.web || ch.pazaryeri || ch.sosyal)) warnings.push(`Satış kanalı payları toplamı %${Math.round(shareSum)}; oranlar 100’e göre normalize edildi.`);
  const shipping = b.shippingByCustomer ? 0 : n(b.shippingPerOrder);
  const P = n(t.avgPrice);
  const k = n(t.kdv);
  const netSales = P / (1 + k / 100);
  const kdvAmount = P - netSales;
  const commission = P * commPct;
  const returns = netSales * (n(t.returnPct) / 100);
  const otherVar = n(t.otherVarPerUnit);
  const variable = prodUnit + shipping + commission + returns + otherVar;

  /* --- Başlangıç yatırımı (A) --- */
  const co = cfg.company;
  const setupLines = SETUP_ITEMS.map((d) => {
    const v = co.setup[d.key];
    if (d.auto === 'rekabet') {
      const applies = isLtdAs(cfg);
      return { key: d.key, label: d.label, kind: d.kind, freq: 'once', reason: d.reason, applies, amount: applies ? n(co.capital) * 0.0004 : 0, src: 'resmi', note: `Sermaye ${n(co.capital).toLocaleString('tr-TR')} ₺ × ‰0,4` };
    }
    const line = itemLine(d, v, cfg);
    if (d.key === 'sicil_oda' && co.type === 'sahis') line.label = co.registry === 'tacir' ? 'Ticaret sicili ve ticaret odası (tacir)' : 'Esnaf ve sanatkârlar odası kaydı (esnaf)';
    return line;
  });

  const machineLines = hasOwn(cfg) && !p.noMachine
    ? MACHINES.filter((m) => p.machines[m.key].selected).map((m) => {
        const v = p.machines[m.key];
        return { key: m.key, label: `${m.label}${v.brand || v.model ? ` · ${[v.brand, v.model].filter(Boolean).join(' ')}` : ''}${v.condition === 'ikinci' ? ' (2. el)' : ''}`, kind: 'istege', freq: 'once', applies: true, amount: n(v.price), src: n(v.price) > 0 ? (v.est ? 'tahmini' : 'kullanici') : 'eksik', note: v.warranty ? `Garanti: ${v.warranty}` : '' };
      })
    : [];
  const extraLines = hasOwn(cfg) ? EXTRAS.map((d) => itemLine({ ...d, kind: 'istege', freq: 'once' }, p.extras[d.key], cfg)) : [];

  // ilk malzeme alımı
  const matUnitsOwn = ownUnits;
  const matUnitsOut = hasOut(cfg) && cfg.fason.materialsBy === 'ben' ? outUnits : 0;
  const matUnits = matUnitsOwn + matUnitsOut;
  const packUnits = ownUnits + (cfg.fason.packagingByWorkshop ? 0 : outUnits);
  const purchases = recipe.map((l) => ({ ...l, ...purchaseLine(l.material, l.qty, l.waste, matUnits), units: matUnits }));
  const packPurchases = pack.map((l) => ({ ...l, ...purchaseLine(l.material, l.qty, 0, packUnits), units: packUnits }));
  const materialPurchase = purchases.reduce((a, x) => a + x.cost, 0);
  const packagingPurchase = packPurchases.reduce((a, x) => a + x.cost, 0);

  // fason ilk sipariş (malzeme hariç — malzeme yukarıda), numune & kalıp ayrı
  const fasonUnitsFirst = outUnits;
  const fasonOrder = hasOut(cfg) && fasonUnitsFirst > 0
    ? fasonUnitsFirst * (n(cfg.fason.unitSewing) + n(cfg.fason.qcPerUnit) + n(cfg.fason.packagingPerUnit)) + n(cfg.fason.shippingTotal)
    : 0;
  const fasonSrc = cfg.fason.est ? 'tahmini' : 'kullanici';
  const laborCash = hasOwn(cfg) && p.laborIsCash ? ownUnits * n(p.laborHours) * n(p.hourlyRate) : 0;

  const brandLines = BRAND_ITEMS.map((d) => itemLine(d, b.items[d.key], cfg));
  const mktLines = MARKETING_ITEMS.map((d) => itemLine(d, cfg.marketing.items[d.key], cfg));
  const wsDefs = WORKSPACE_ITEMS[cfg.workspace.type];
  const wsLines = wsDefs.map((d) => itemLine(d, cfg.workspace.items[cfg.workspace.type][d.key], cfg));

  const onceOf = (lines) => lines.filter((l) => l.applies && l.freq === 'once');
  const sumL = (lines) => lines.reduce((a, l) => a + n(l.amount), 0);

  const startupGroups = [
    { key: 'kurulus', label: 'Şirket kuruluşu', lines: setupLines.filter((l) => l.applies) },
    { key: 'makine', label: 'Makine ve ekipman', lines: [...machineLines, ...onceOf(extraLines)] },
    {
      key: 'malzeme', label: 'İlk malzeme alımı',
      lines: [
        ...purchases.map((x) => ({ key: x.id, label: `${x.material?.name || 'Silinmiş malzeme'} · ${round2(x.buy).toLocaleString('tr-TR')} ${x.material?.unit || ''}`, kind: 'zorunlu', freq: 'once', applies: true, amount: x.cost, src: x.hasPrice ? 'katalog' : 'eksik', note: x.material?.updatedAt ? `Fiyat kontrolü: ${x.material.updatedAt.split('-').reverse().join('.')}` : 'Fiyat tarihi yok' })),
        ...(fasonOrder ? [{ key: 'fason_order', label: `İlk fason üretim (${fasonUnitsFirst} adet dikim, KK, paketleme, nakliye)`, kind: 'zorunlu', freq: 'once', applies: true, amount: fasonOrder, src: fasonSrc }] : []),
        ...(laborCash ? [{ key: 'labor_cash', label: `İlk üretim işçiliği (${ownUnits} adet)`, kind: 'kosullu', freq: 'once', applies: true, amount: laborCash, src: 'hesap', note: 'İşçiliği nakit ödeyeceğinizi belirttiniz' }] : []),
      ],
    },
    {
      key: 'numune', label: 'Numune ve kalıp',
      lines: hasOut(cfg) ? [
        { key: 'sample', label: 'Numune üretim ücreti', kind: 'zorunlu', freq: 'once', applies: true, amount: n(cfg.fason.sampleFee), src: n(cfg.fason.sampleFee) ? fasonSrc : 'eksik', reason: 'Dışarıda üretimde seri üretim öncesi numune onayı gerekir.' },
        { key: 'pattern', label: 'Kalıp ve model hazırlama ücreti', kind: 'zorunlu', freq: 'once', applies: true, amount: n(cfg.fason.patternFee), src: n(cfg.fason.patternFee) ? fasonSrc : 'eksik' },
      ] : [],
    },
    { key: 'marka', label: 'Marka ve web sitesi', lines: onceOf(brandLines) },
    {
      key: 'ambalaj', label: 'İlk ambalaj ve etiket',
      lines: packPurchases.map((x) => ({ key: x.id, label: `${x.material?.name || 'Silinmiş malzeme'} · ${round2(x.buy).toLocaleString('tr-TR')} ${x.material?.unit || ''}`, kind: 'zorunlu', freq: 'once', applies: true, amount: x.cost, src: x.hasPrice ? 'katalog' : 'eksik' })),
    },
    {
      key: 'diger', label: 'Diğer başlangıç giderleri',
      lines: [
        ...onceOf(mktLines),
        ...onceOf(wsLines),
        ...(n(t.otherStartup) ? [{ key: 'other', label: 'Diğer (kullanıcı tanımlı)', kind: 'istege', freq: 'once', applies: true, amount: n(t.otherStartup), src: 'kullanici' }] : []),
      ],
    },
  ].map((g) => ({ ...g, total: sumL(g.lines) }));
  const startupTotal = startupGroups.reduce((a, g) => a + g.total, 0);

  /* --- Aylık sabit giderler (B) --- */
  const bk = bagkurMonthly(state, cfg);
  const recLines = RECURRING_ITEMS.map((d) => {
    if (d.auto === 'bagkur') return { key: d.key, label: d.label, kind: d.kind, freq: 'monthly', reason: d.reason, applies: true, amount: bk.amount, src: bk.src, note: bk.note };
    return itemLine(d, co.recurring[d.key], cfg);
  });
  const maintenance = hasOwn(cfg) && !p.noMachine
    ? MACHINES.filter((m) => p.machines[m.key].selected && n(p.machines[m.key].maintenanceYearly) > 0).map((m) => ({ key: `bakim_${m.key}`, label: `${m.label} bakımı`, kind: 'istege', freq: 'yearly', applies: true, amount: n(p.machines[m.key].maintenanceYearly), src: p.machines[m.key].est ? 'tahmini' : 'kullanici' }))
    : [];
  const rec = (lines) => lines.filter((l) => l.applies && (l.freq === 'monthly' || l.freq === 'yearly')).map((l) => ({ ...l, monthly: monthlyOf(l.freq, l.amount) }));
  const byKey = (lines, keys) => lines.filter((l) => keys.includes(l.key));
  const recAll = rec(recLines);
  const brandRec = rec(brandLines);
  const wsRec = rec(wsLines);
  const monthlyGroups = [
    { key: 'mm', label: 'Mali müşavir', lines: byKey(recAll, ['mm_aylik', 'beyanname']) },
    { key: 'sgk', label: 'SGK / Bağ-Kur yükümlülükleri', lines: byKey(recAll, ['bagkur']) },
    { key: 'yazilim', label: 'Yazılım ve dijital altyapı', lines: [...byKey(recAll, ['efatura', 'muh_yazilim', 'eimza_yenileme']), ...byKey(brandRec, ['alan_adi', 'hosting', 'eticaret'])] },
    { key: 'reklam', label: 'Reklam ve pazarlama', lines: rec(mktLines) },
    { key: 'kira', label: 'Kira / çalışma alanı', lines: byKey(wsRec, ['kira', 'uyelik', 'aidat']) },
    { key: 'enerji', label: 'Elektrik ve internet', lines: byKey(wsRec, ['elektrik', 'internet']) },
    { key: 'diger', label: 'Diğer giderler', lines: [...byKey(recAll, ['oda_aidat', 'diger_yuk']), ...byKey(brandRec, ['pazaryeri_uyelik']), ...byKey(wsRec, ['depolama', 'bakim']), ...rec(maintenance)] },
  ].map((g) => ({ ...g, total: g.lines.reduce((a, l) => a + l.monthly, 0) }));
  const monthlyFixed = monthlyGroups.reduce((a, g) => a + g.total, 0);

  /* --- Birim ekonomisi (C) ve finansal sonuç (D) --- */
  const sales = Math.max(0, n(t.monthlySales));
  const fixedPerUnit = sales > 0 ? monthlyFixed / sales : 0;
  const unitTotal = variable + fixedPerUnit;
  const contribution = netSales - variable;
  const preTaxUnit = contribution - fixedPerUnit;
  const machineInvestment = startupGroups.find((g) => g.key === 'makine').total;
  const machineShare = machineInvestment / Math.max(1, n(p.amortUnits));

  const ye = youngEntrepreneur(state, cfg);
  const taxRate = co.type === 'sahis' ? n(t.taxPct) : param(state, 'kurumlarVergisi');
  const monthlyPreTax = preTaxUnit * sales;
  const exemptMonthly = ye.eligible ? ye.limit / 12 : 0;
  const taxable = Math.max(0, monthlyPreTax - exemptMonthly);
  const monthlyTax = taxable * (taxRate / 100);
  const monthlyNet = monthlyPreTax - monthlyTax;
  const taxUnit = sales > 0 ? monthlyTax / sales : 0;
  const profitUnit = preTaxUnit - taxUnit;

  const varFixed = prodUnit + shipping + otherVar + fixedPerUnit;
  const m = n(t.targetMargin) / 100;
  const denom = (1 - n(t.returnPct) / 100 - m) / (1 + k / 100) - commPct;
  const suggestedPrice = denom > 0 ? varFixed / denom : null;
  const beDenom = (1 - n(t.returnPct) / 100) / (1 + k / 100) - commPct;
  const breakEvenPrice = beDenom > 0 ? varFixed / beDenom : null;
  const breakEvenUnits = contribution > 0 ? Math.ceil(monthlyFixed / contribution) : null;

  const runway = monthlyFixed * (n(t.monthsToFirstSale) + n(t.reserveMonths));
  const capitalNeed = startupTotal + runway;
  const payback = monthlyNet > 0 ? startupTotal / monthlyNet : null;

  const firstProductionCost = startupGroups.filter((g) => ['malzeme', 'numune', 'ambalaj'].includes(g.key)).reduce((a, g) => a + g.total, 0);
  if (n(t.budget) > 0 && firstProductionCost > n(t.budget)) warnings.push(`İlk üretim maliyeti (${Math.round(firstProductionCost).toLocaleString('tr-TR')} ₺) ayırdığınız bütçeyi (${n(t.budget).toLocaleString('tr-TR')} ₺) aşıyor.`);
  if (P > 0 && breakEvenPrice && P < breakEvenPrice) warnings.push('Ortalama satış fiyatınız başabaş fiyatının altında: her satış zarar ettiriyor.');
  if (sales > 0 && breakEvenUnits && sales < breakEvenUnits) warnings.push(`Aylık satış hedefiniz (${sales}) başabaş adedinin (${breakEvenUnits}) altında.`);

  const allLines = [...startupGroups.flatMap((g) => g.lines), ...monthlyGroups.flatMap((g) => g.lines)];
  const missingAmounts = allLines.filter((l) => l.src === 'eksik' && l.applies).length;

  return {
    cfg, warnings, missingAmounts, totalUnits, ownUnits, outUnits, share,
    recipe, pack, purchases, packPurchases, materialUnit, packagingUnit, laborUnit, ownUnitCost, fu, fasonQty,
    startupGroups, startupTotal, monthlyGroups, monthlyFixed,
    unit: {
      material: unitParts.material, labor: unitParts.labor, sewing: unitParts.sewing, packaging: unitParts.packaging,
      shipping, commission, commPct, returns, otherVar, variable, fixedPerUnit, unitTotal, machineShare, kdvAmount, netSales, contribution, taxUnit, profitUnit, preTaxUnit,
    },
    fin: {
      capitalNeed, runway, monthlyFixed, monthlyVariable: variable * sales, monthlyTotal: monthlyFixed + variable * sales,
      unitTotal, suggestedPrice, breakEvenPrice, profitUnit, breakEvenUnits, payback, monthlyRevenue: P * sales, monthlyNetSales: netSales * sales,
      monthlyPreTax, monthlyTax, monthlyNet, taxRate, exemptMonthly, firstProductionCost,
    },
    ye, bagkur: bk,
  };
}

const round2 = (v) => Math.round(v * 100) / 100;

export const newRecipeLine = (materialId = '', waste = 10) => ({ id: uid(), materialId, qty: 0, waste });
export const stamp = () => today();
