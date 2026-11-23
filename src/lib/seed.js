import { uid, today } from './format.js';
import { defaultSim } from './simulator.js';

export const MATERIAL_CATEGORIES = [
  { id: 'kumas', label: 'Kumaş ve Deri' },
  { id: 'aksesuar', label: 'Aksesuar' },
  { id: 'uretim', label: 'Üretim Malzemeleri' },
  { id: 'ambalaj', label: 'Ambalaj' },
];

export const UNITS = ['metre', 'metrekare', 'adet', 'kilogram', 'gram', 'paket', 'top', 'makara', 'litre', 'set', 'çift'];

const mat = (category, name, unit, description = '') => ({
  id: uid(),
  category,
  name,
  unit,
  price: null,
  priceSource: 'manuel', // manuel | teklif | web | tahmini
  supplier: '',
  purchasedQty: 0,
  updatedAt: '',
  url: '',
  description,
  history: [],
  moq: 0,
  stockQty: 0,
});

export const seedMaterials = () => [
  mat('kumas', 'Suni deri (PU)', 'metre', 'En bilgisini (ör. 140 cm) açıklamaya yazın.'),
  mat('kumas', 'Vegan deri', 'metre'),
  mat('kumas', 'Hakiki deri', 'metrekare', 'Deri genellikle ayak kare (sqft) veya m² ile satılır; birimi kontrol edin.'),
  mat('kumas', 'Süet', 'metre'),
  mat('kumas', 'Kadife', 'metre'),
  mat('kumas', 'Saten', 'metre'),
  mat('kumas', 'Pamuklu astar', 'metre'),
  mat('kumas', 'Polyester astar', 'metre'),
  mat('kumas', 'Kanvas kumaş', 'metre'),
  mat('kumas', 'Peluş kumaş', 'metre'),
  mat('kumas', 'Pamuklu kumaş', 'metre'),
  mat('kumas', 'Polyester kumaş', 'metre'),
  mat('aksesuar', 'Metal fermuar', 'adet'),
  mat('aksesuar', 'Plastik fermuar', 'metre'),
  mat('aksesuar', 'Fermuar başlığı', 'adet'),
  mat('aksesuar', 'Zincir', 'metre'),
  mat('aksesuar', 'Çanta tokası', 'adet'),
  mat('aksesuar', 'Ayarlanabilir askı aparatı', 'adet'),
  mat('aksesuar', 'D halkası', 'adet'),
  mat('aksesuar', 'Metal ayak', 'adet'),
  mat('aksesuar', 'Çanta kilidi', 'adet'),
  mat('aksesuar', 'Mıknatıslı çıtçıt', 'adet'),
  mat('aksesuar', 'Kalp charm', 'adet'),
  mat('aksesuar', 'Yıldız charm', 'adet'),
  mat('aksesuar', 'Kiraz charm', 'adet'),
  mat('aksesuar', 'İnci', 'paket'),
  mat('aksesuar', 'Boncuk', 'paket'),
  mat('aksesuar', 'Süs aksesuarları', 'adet'),
  mat('aksesuar', 'Fiyonk', 'adet'),
  mat('aksesuar', 'Kurdele', 'metre'),
  mat('aksesuar', 'Logo plakası', 'adet'),
  mat('uretim', 'Dikiş ipliği', 'makara'),
  mat('uretim', 'Tela', 'metre'),
  mat('uretim', 'Çanta sertleştirici', 'metre'),
  mat('uretim', 'EVA', 'metrekare'),
  mat('uretim', 'Sünger', 'metre'),
  mat('uretim', 'Çanta tabanı', 'adet'),
  mat('uretim', 'Kenar boyası', 'litre'),
  mat('uretim', 'Yapıştırıcı', 'litre'),
  mat('uretim', 'Dikiş iğnesi', 'paket'),
  mat('uretim', 'Kesim malzemeleri', 'set'),
  mat('ambalaj', 'Toz torbası', 'adet'),
  mat('ambalaj', 'Kutu', 'adet'),
  mat('ambalaj', 'Marka etiketi / kart', 'adet'),
  mat('ambalaj', 'Kargo poşeti', 'adet'),
];

export const EQUIPMENT_CATEGORIES = [
  'Ev tipi dikiş makineleri',
  'Sanayi tipi dikiş makineleri',
  'Çanta dikim makineleri',
  'Çift transportlu makineler',
  'Overlok makineleri',
  'Kesim masası',
  'Kumaş makası',
  'Döner kesici',
  'Cetvel ve ölçüm ekipmanları',
  'Ütü ve buhar sistemi',
  'Perçin ve çıtçıt presi',
];

export const COMPANY_TYPES = [
  { id: 'sahis', label: 'Şahıs İşletmesi' },
  { id: 'limited', label: 'Limited Şirket' },
  { id: 'anonim', label: 'Anonim Şirket' },
];

const item = (label, note = '') => ({ id: uid(), label, amount: 0, note, verified: false });

const setupItems = (type) => {
  const common = [
    item('Mali müşavir kuruluş hizmeti', 'Mali müşavirden yazılı teklif alın. TÜRMOB / il odası ücret tarifesi asgari tutarları belirler.'),
    item('E-imza (nitelikli elektronik sertifika)', 'Kamu SM veya özel ESHS fiyatlarına bakın; geçerlilik süresine göre değişir.'),
    item('Mali mühür / e-fatura başvurusu', 'E-fatura ve e-arşiv için entegratör veya GİB portal yöntemi seçimine göre değişir.'),
  ];
  if (type === 'sahis') {
    return [
      item('Vergi dairesi işe başlama kaydı', 'Vergi dairesi kaydında harç alınmaz; internet vergi dairesi veya mali müşavir ile yapılır.'),
      item('Noter imza beyannamesi', 'Noterlik ücret tarifesine göre; esnaf/tacir kaydı için gerekebilir.'),
      item('Ticaret sicili veya esnaf odası kaydı', 'Faaliyet ve kazanç durumuna göre Ticaret Sicili/TSO veya Esnaf ve Sanatkârlar Odası kaydı yapılır.'),
      item('Oda kayıt ücreti', 'İlgili odanın güncel kayıt ücreti tarifesine bakın.'),
      ...common,
      item('Diğer resmî masraflar', 'Tabela, ruhsat (fiziki iş yeri varsa) vb.'),
    ];
  }
  return [
    item('Ana sözleşme hazırlığı ve MERSİS başvurusu', 'MERSİS üzerinden yapılır; ana sözleşme ticaret sicili müdürlüğünde imzalanabilir.'),
    item('Noter / sicil müdürlüğü imza işlemleri', 'Müdür/yönetim kurulu imza beyannamesi; noter ücret tarifesine göre.'),
    item('Ticaret sicili tescil ve ilan (TTSG) giderleri', 'Ticaret Sicil Gazetesi ilan ücreti karakter sayısına göre hesaplanır.'),
    item('Rekabet Kurumu payı', 'Sermayenin on binde dördü (‰0,4) oranında yatırılır (TTK / 4054 s. Kanun).'),
    item('Oda kayıt ücreti (TSO)', 'Sermayeye göre değişebilir; ilgili Ticaret Odası tarifesine bakın.'),
    item('Sermaye blokajı / banka işlemleri', type === 'limited'
      ? 'Asgari sermaye 01.01.2024 itibarıyla 50.000 ₺. Ödeme şartları için güncel TTK hükümlerini kontrol edin.'
      : 'Asgari sermaye 01.01.2024 itibarıyla 250.000 ₺ (kayıtlı sermayede 500.000 ₺). Sermayenin en az %25’i tescilden önce ödenir.'),
    item('Defter tasdiki (açılış)', 'Elektronik defter kullanılıyorsa farklılaşır.'),
    ...common,
    item('Diğer resmî masraflar', 'Kaşe, tabela, adres/sanal ofis sözleşmesi vb.'),
  ];
};

const runningItems = (type) => {
  const base = [
    item('Mali müşavir aylık ücreti', 'Aylık', 'aylik'),
    item('E-fatura / e-arşiv paket ücreti', 'Yıllık kontör veya paket olabilir'),
    item('E-imza / mali mühür yenileme', 'Yıllık'),
    item('Oda aidatı', 'Yıllık'),
  ].map((x) => ({ ...x, period: 'aylik' }));
  base[2].period = 'yillik';
  base[3].period = 'yillik';
  base[1].period = 'yillik';
  if (type === 'sahis') {
    return [...base, { ...item('Bağ-Kur primi (sahip)', 'Aylık Giderler modülündeki sigorta senaryosundan doğrulayın.'), period: 'aylik' }];
  }
  return [
    ...base,
    { ...item('Ortak/müdür Bağ-Kur primi', 'Ltd ortakları ve AŞ yönetim kurulu üyesi ortaklar 4/b kapsamında değerlendirilebilir.'), period: 'aylik' },
    { ...item('Defter tasdik / kapanış', ''), period: 'yillik' },
    { ...item(type === 'anonim' ? 'Bağımsız denetim / genel kurul giderleri (gerekirse)' : 'Genel kurul ve tescil giderleri', ''), period: 'yillik' },
  ];
};

export const COMPANY_FACTS = {
  sahis: {
    tax: 'Gelir vergisi (artan oranlı tarife, GVK md. 103).',
    liability: 'Sınırsız sorumluluk; işletme borçlarından kişisel mal varlığı ile sorumlu olunur.',
    capital: 'Asgari sermaye şartı yok.',
    pros: ['Kuruluş hızlı ve düşük maliyetli', 'Muhasebe yükü daha hafif (işletme hesabı esasına uygunsa)', 'Genç girişimci kazanç istisnasından yararlanılabilir (şartlara bağlı)'],
    cons: ['Sınırsız kişisel sorumluluk', 'Kazanç arttıkça gelir vergisi dilimi yükselir', 'Ortak almak ve yatırım almak zordur'],
  },
  limited: {
    tax: 'Kurumlar vergisi (genel oran %25) + kâr dağıtımında stopaj.',
    liability: 'Ortaklar şirket borçlarından taahhüt ettikleri sermaye ile sınırlı sorumludur (kamu borçlarında müdür/ortak sorumluluğu ayrıca değerlendirilir).',
    capital: 'Asgari 50.000 ₺ (01.01.2024 itibarıyla).',
    pros: ['Kurumsal görünüm ve marka güveni', 'Sınırlı sorumluluk', 'Ortaklık yapısı esnek'],
    cons: ['Bilanço esası ve daha yüksek mali müşavir ücreti', 'Kuruluş ve tescil masrafları daha yüksek', 'Genç girişimci kazanç istisnası uygulanmaz'],
  },
  anonim: {
    tax: 'Kurumlar vergisi (genel oran %25) + kâr dağıtımında stopaj.',
    liability: 'Pay sahipleri yalnızca taahhüt ettikleri sermaye ile sorumludur.',
    capital: 'Asgari 250.000 ₺; kayıtlı sermaye sisteminde 500.000 ₺ (01.01.2024 itibarıyla).',
    pros: ['Yatırımcı alma ve hisse devri kolay', 'Halka arz yolu açık', 'En kurumsal yapı'],
    cons: ['En yüksek kuruluş ve işletme maliyeti', 'Daha ağır formalite (genel kurul, yönetim kurulu)', 'Küçük ölçekli başlangıç için genellikle gereğinden ağır'],
  },
};

export const seedCompany = () => ({
  selectedType: 'sahis',
  setup: { sahis: setupItems('sahis'), limited: setupItems('limited'), anonim: setupItems('anonim') },
  running: { sahis: runningItems('sahis'), limited: runningItems('limited'), anonim: runningItems('anonim') },
  checklist: [
    { id: uid(), text: 'Marka adı ön araştırması (TÜRKPATENT marka sorgu)', done: false },
    { id: uid(), text: 'Marka tescil başvurusu (sınıf 18: çantalar, deri ürünleri)', done: false },
    { id: uid(), text: 'Şirket türüne karar ver ve mali müşavirle görüş', done: false },
    { id: uid(), text: 'E-imza al', done: false },
    { id: uid(), text: 'Vergi dairesi kaydı / MERSİS başvurusu', done: false },
    { id: uid(), text: 'Oda kaydı', done: false },
    { id: uid(), text: 'Ticari banka hesabı aç', done: false },
    { id: uid(), text: 'E-fatura / e-arşiv geçişi', done: false },
    { id: uid(), text: 'Sanal POS veya ödeme altyapısı başvurusu', done: false },
    { id: uid(), text: 'Pazaryeri satıcı hesapları', done: false },
    { id: uid(), text: 'KVKK aydınlatma metni, mesafeli satış sözleşmesi, iade politikası', done: false },
  ],
});

/* Resmî/mevzuat parametreleri — her biri kaynak ve tarih taşır. */
export const seedParams = () => [
  {
    key: 'asgariBrut', label: 'Asgari ücret (brüt, aylık)', value: 33030, unit: '₺',
    validFrom: '2026-01-01', source: 'Asgari Ücret Tespit Komisyonu / ÇSGB (basın kaynaklarından alındı)', url: 'https://www.csgb.gov.tr',
    status: 'dogrulanmali', note: 'Bağ-Kur prim alt sınırı ve SGK hesaplarında esas alınır.',
  },
  {
    key: 'bagkurOran', label: 'Bağ-Kur (4/b) toplam prim oranı', value: 35.75, unit: '%',
    validFrom: '2026-01-01', source: 'Kaynaklar arasında %34,5 – %35,75 aralığında çelişki var; SGK duyurusundan doğrulayın.', url: 'https://www.sgk.gov.tr',
    status: 'dogrulanmali', note: 'Prim; beyan edilen kazanç (alt sınır: asgari ücret brüt) üzerinden hesaplanır.',
  },
  {
    key: 'bagkurIndirim', label: 'Düzenli ödeme prim indirimi (5 puan)', value: 5, unit: 'puan',
    validFrom: '2026-01-01', source: '5510 s. Kanun md. 81 (ı) — borcu olmayan ve primini zamanında ödeyenler', url: 'https://www.mevzuat.gov.tr',
    status: 'dogrulanmali', note: '',
  },
  {
    key: 'bagkurTavanKat', label: 'Prime esas kazanç tavanı (asgari ücretin katı)', value: 7.5, unit: 'kat',
    validFrom: '2026-01-01', source: '5510 s. Kanun md. 82', url: 'https://www.mevzuat.gov.tr', status: 'dogrulanmali', note: '',
  },
  {
    key: 'isverenSgkOran', label: 'Personel için işveren SGK + işsizlik payı', value: 22.75, unit: '%',
    validFrom: '2026-01-01', source: 'Teşvik/indirim durumuna göre değişir; mali müşavirinizle doğrulayın.', url: 'https://www.sgk.gov.tr',
    status: 'dogrulanmali', note: '5 puanlık hazine desteği uygulanıp uygulanmadığını kontrol edin.',
  },
  {
    key: 'gencGirisimciLimit', label: 'Genç girişimci kazanç istisnası (yıllık)', value: 400000, unit: '₺',
    validFrom: '2026-01-01', source: '332 Seri No.lu Gelir Vergisi Genel Tebliği (basın ve meslek sitelerinden alındı)', url: 'https://www.gib.gov.tr',
    status: 'dogrulanmali', note: 'GVK md. 20/A. 7440 s. Kanun sonrası tutar GVK tarifesinin ikinci dilim tutarına bağlıdır.',
  },
  {
    key: 'kurumlarVergisi', label: 'Kurumlar vergisi genel oranı', value: 25, unit: '%',
    validFrom: '2023-01-01', source: 'KVK md. 32 (7456 s. Kanun ile)', url: 'https://www.gib.gov.tr', status: 'dogrulanmali', note: '',
  },
  {
    key: 'kdvCanta', label: 'Çanta satışında KDV oranı', value: 20, unit: '%',
    validFrom: '2023-07-10', source: 'Genel KDV oranı. Ürününüzün GTİP / KDV listesindeki yerini mali müşavirinizle doğrulayın.', url: 'https://www.gib.gov.tr',
    status: 'dogrulanmali', note: '',
  },
];

export const seedRegUpdates = () => [
  { id: uid(), date: '2026-01-01', title: 'Asgari ücret 2026', detail: 'Brüt asgari ücret 33.030 ₺ olarak belirlendi (net ≈ 28.075 ₺). Bağ-Kur alt sınırı buna göre güncellenir.', source: 'ÇSGB / basın', url: 'https://www.csgb.gov.tr', status: 'dogrulanmali' },
  { id: uid(), date: '2026-01-01', title: 'Genç girişimci kazanç istisnası tutarı', detail: '2026 yılı için istisna tutarı 400.000 ₺ olarak uygulanmaktadır (GVK 20/A; ikinci tarife dilimine bağlı).', source: 'GİB – 332 Seri No.lu GVGT', url: 'https://www.gib.gov.tr', status: 'dogrulanmali' },
  { id: uid(), date: '2026-01-01', title: 'Genç girişimci Bağ-Kur prim desteği', detail: 'Bazı kaynaklar 2026’da yeni girişimciler için Bağ-Kur prim desteğinin uygulanmadığını belirtiyor. SGK’dan güncel durumu doğrulayın.', source: 'Meslek siteleri (doğrulanmadı)', url: 'https://www.sgk.gov.tr', status: 'dogrulanmali' },
  { id: uid(), date: '2025-12-01', title: 'Sigorta prim oranı değişikliği iddiası', detail: 'Bazı kaynaklar tüm sigorta kollarında 1 puanlık artıştan söz ediyor; Bağ-Kur oranı bu nedenle %34,5–%35,75 aralığında farklı yazılıyor.', source: 'Meslek siteleri (doğrulanmadı)', url: 'https://www.sgk.gov.tr', status: 'dogrulanmali' },
  { id: uid(), date: '2024-01-01', title: 'Asgari sermaye tutarları arttı', detail: 'Limited şirket için 50.000 ₺, anonim şirket için 250.000 ₺ (kayıtlı sermayede 500.000 ₺).', source: 'Cumhurbaşkanı Kararı / Ticaret Bakanlığı', url: 'https://ticaret.gov.tr', status: 'dogrulanmali' },
  { id: uid(), date: '2023-07-10', title: 'Genel KDV oranı %20', detail: 'Genel KDV oranı %18’den %20’ye çıkarıldı.', source: 'Cumhurbaşkanı Kararı (7346)', url: 'https://www.gib.gov.tr', status: 'dogrulanmali' },
];

export const INCENTIVES = [
  {
    title: 'Genç Girişimcilerde Kazanç İstisnası (GVK md. 20/A)',
    summary: 'Şahıs işletmesi olarak ilk kez vergi mükellefiyeti tesis ettirenlerin ticari kazançlarının belirli tutarı, 3 vergilendirme dönemi boyunca gelir vergisinden istisnadır.',
    conditions: [
      'Mükellefiyet başlangıcında 18 yaşını doldurmuş, 29 yaşını doldurmamış olmak.',
      'Ticari, zirai veya mesleki kazanç nedeniyle ilk defa vergi mükellefiyeti tesis ettirmek.',
      'Faaliyete bizzat katılmak veya işi bizzat sevk ve idare etmek.',
      'Faaliyeti, işi bırakan eş veya üçüncü derece dahil kan/kayın hısımlarından devralmamış olmak.',
      'Ortaklık halinde kurulursa tüm ortakların şartları taşıması gerekir.',
      'Limited ve anonim şirketler (kurumlar vergisi mükellefleri) kapsam dışıdır.',
    ],
    source: 'Gelir Vergisi Kanunu md. 20/A – GİB',
    url: 'https://www.gib.gov.tr',
    paramKey: 'gencGirisimciLimit',
  },
  {
    title: 'Evde Üretim – Esnaf Muafiyeti (GVK md. 9/6)',
    summary: 'Ev hanımları başta olmak üzere evlerinde imal ettikleri ürünleri iş yeri açmadan, işçi çalıştırmadan internet üzerinden satanlar belirli hasılat sınırına kadar esnaf muafiyetinden yararlanabilir.',
    conditions: [
      'Ürünlerin ikamet edilen konutta, bizzat üretilmesi.',
      'İş yeri açılmaması ve işçi çalıştırılmaması.',
      'Yıllık hasılatın güncel sınırı aşmaması (sınırı GİB duyurularından kontrol edin).',
      'Vergi dairesinden esnaf muafiyet belgesi alınması; tevkifat (%4 vb.) uygulanabileceğini değerlendirin.',
    ],
    source: 'Gelir Vergisi Kanunu md. 9/6 – GİB',
    url: 'https://www.gib.gov.tr',
  },
  {
    title: 'KOSGEB Girişimcilik Destekleri',
    summary: 'Uygulamalı Girişimcilik Eğitimi sertifikası ile KOSGEB girişimci destek programlarına başvurulabilir. Program içerikleri ve üst limitler dönemsel olarak değişir.',
    conditions: ['Güncel çağrıları ve şartları KOSGEB e-Hizmetler üzerinden kontrol edin.'],
    source: 'KOSGEB',
    url: 'https://www.kosgeb.gov.tr',
  },
];

const expense = (name, category, frequency = 'aylik') => ({ id: uid(), name, category, amount: 0, frequency, active: true, note: '' });

export const EXPENSE_CATEGORIES = ['Resmî & Muhasebe', 'Dijital & Web', 'Satış & Pazarlama', 'Lojistik', 'İşletme', 'Personel', 'Finansal'];

export const seedExpenses = () => [
  expense('Mali müşavir', 'Resmî & Muhasebe'),
  expense('E-fatura ve e-arşiv', 'Resmî & Muhasebe', 'yillik'),
  expense('Muhasebe yazılımı', 'Resmî & Muhasebe'),
  expense('İnternet sitesi (altyapı / abonelik)', 'Dijital & Web'),
  expense('Hosting ve alan adı', 'Dijital & Web', 'yillik'),
  expense('Pazaryeri üyelikleri', 'Satış & Pazarlama'),
  expense('Reklam', 'Satış & Pazarlama'),
  expense('Kargo (sabit anlaşma)', 'Lojistik'),
  expense('Paketleme (genel stok)', 'Lojistik'),
  expense('Depolama', 'Lojistik'),
  expense('Elektrik', 'İşletme'),
  expense('Kira', 'İşletme'),
  expense('Banka ve ödeme altyapısı sabit ücretleri', 'Finansal'),
];

export const seedCollections = () => [
  { id: 'c-signature', name: 'Signature Collection', description: 'Markanın imza modelleri', color: '#7b2d3b' },
  { id: 'c-romantic', name: 'Romantic Collection', description: 'Fiyonk, inci ve pudra tonları', color: '#d99aa5' },
  { id: 'c-everyday', name: 'Everyday Collection', description: 'Günlük kullanım için fonksiyonel modeller', color: '#b08d6e' },
  { id: 'c-limited', name: 'Limited Edition', description: 'Sınırlı sayıda üretilen özel seri', color: '#3d2a2e' },
];

export const seedEquipment = () =>
  EQUIPMENT_CATEGORIES.map((category) => ({
    id: uid(), category, name: category.replace(/lar(ı)?$|ler(i)?$/, ''), brand: '', model: '', purpose: '',
    condition: 'sifir', price: null, url: '', status: 'arastiriliyor', watt: 0, notes: '',
  }));

export const PRODUCT_CATEGORIES = ['Omuz çantası', 'El çantası', 'Çapraz çanta', 'Mini çanta', 'Clutch', 'Tote', 'Sırt çantası', 'Bel çantası', 'Cüzdan', 'Diğer'];

export const emptyProduct = () => ({
  id: uid(), name: '', code: '', collectionId: '', category: 'Omuz çantası', photo: '',
  colors: '', width: 0, height: 0, depth: 0,
  fabric: '', leather: '', lining: '', zipper: '', strap: '', hardware: '',
  innerPockets: 0, outerPockets: 0, productionHours: 0, notes: '',
  bom: [], packagingCost: 0, createdAt: today(),
});

export const initialState = () => {
  const materials = seedMaterials();
  return {
    version: 1,
    settings: {
      brandName: 'Bag Atelier',
      capital: 0,
      startDate: today(),
      hourlyRate: 0,
      electricityTariff: 0,
      machinePowerW: 400,
      amortizationUnits: 500,
      defaultWaste: 10,
      staleDays: 90,
      taxReservePct: 20,
    },
    params: seedParams(),
    regUpdates: seedRegUpdates(),
    collections: seedCollections(),
    products: [],
    materials,
    equipment: seedEquipment(),
    workshops: [],
    company: seedCompany(),
    expenses: seedExpenses(),
    insurance: { scenario: '4b', declaredBase: 0, discount: true, employees: 0, employeeGross: 0 },
    pricing: {},
    production: [],
    sales: [],
    ledger: [],
    payments: [],
    sim: defaultSim(),
    simSaves: [],
  };
};
