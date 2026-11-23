# Bag Atelier – My Brand Management Studio

Kendi çanta markanızı fikir aşamasından şirket kuruluşuna, malzeme tedariğinden üretime ve fiyatlandırmaya kadar yönetmek için kişisel işletme yönetim platformu. Arayüz Türkçe, para birimi ₺, tarihler GG.AA.YYYY biçiminde.

## Çalıştırma

```powershell
npm install
npm run dev
```

Tarayıcıda `http://localhost:5180` adresini açın. Kalıcı bir sürüm için `npm run build` komutunu çalıştırın; `dist/` klasörü herhangi bir statik barındırmaya yüklenebilir.

## Modüller

| Menü | İçerik |
|---|---|
| İş Kurma Simülatörü | 9 adımlı sihirbaz: iş modeli, şirket ve resmî giderler, makine ve ekipman, malzeme, fason, marka ve satış, pazarlama, çalışma alanı ve hedefler. Her gider Zorunlu, Koşula bağlı veya İsteğe bağlı olarak sınıflandırılır; her tutarın kaynağı (resmî parametre / katalog / kullanıcı / tahmini / girilmedi) etiketlenir. Üstteki canlı toplam çubuğu her seçimle güncellenir. HESAPLA ile başlangıç yatırımı, aylık sabit gider, çanta başı maliyet, önerilen fiyat, başabaş ve geri dönüş süresinin tam dökümü gösterilir. Ekonomik/Dengeli/Profesyonel senaryo karşılaştırması, kaydet/aç, Excel ve PDF (yazdır) dışa aktarma. |
| Yönetim Paneli | Sermaye, harcanan, kullanılabilir bütçe, ortalama maliyet, üretim/satış/stok, ciro (KDV dahil/hariç), tahmini net kâr, sabit gider, başabaş, yaklaşan ödemeler. Hepsi diğer modüllerden hesaplanır. |
| Ürün Kütüphanesi | Modeller, koleksiyonlar, fotoğraf, ölçüler, yapı detayları ve malzeme reçetesi (fire oranlı). Her ürünün maliyeti otomatik hesaplanır. |
| Malzeme & Tedarikçi | Kategorili katalog. Her fiyatın kaynağı, satıcısı, tarihi ve geçmişi tutulur. Fiyatı girilmemiş, eski, kaynaksız ve tahmini fiyatlar ayrıca işaretlenir. Pazaryerlerinde arama bağlantıları sunulur. |
| Kendim Üretirsem | Malzeme + fire + elektrik + işçilik + ambalaj. Ekipman yatırımı ayrı tutulur; birim maliyet ilk yatırım hariç ve dahil olarak gösterilir. |
| Fason Üretim | Atölye teklifleri (numune, kalıp, dikim, MOQ, termin…). 20/50/100/250/500 adet senaryoları kendi üretimle aynı tabloda ve grafikte karşılaştırılır. |
| Atölye & Ekipman | Kategorili ekipman listesi; marka, model, amaç, bağlantı. Sıfır ve ikinci el karşılaştırması. |
| Üretim & Satış | Panelin dayandığı üretim, satış ve stok kayıtları. |
| Fiyatlandırma & Kâr | KDV, maliyet, ambalaj, kargo, komisyonlar, reklam, iade payı, sabit gider payı ve vergi ihtiyatı düşülerek birim net kâr. Fiyat senaryoları, başabaş fiyatı. Ciro hiçbir yerde kâr olarak gösterilmez. |
| Aylık Giderler | Yalnızca tekrarlanan (aylık/yıllık) giderler. 4/a ve 4/b sigorta senaryoları ayrı hesaplanır, iki prim birlikte varsayılmaz. |
| Harcama & Ödemeler | Gerçekleşen harcamalar ve ödeme takvimi. "Ödendi" işaretlenen ödeme harcamaya dönüşür; tekrarlayan ödeme otomatik yenilenir. |
| Şirket Kuruluş Merkezi | Şahıs/Limited/Anonim karşılaştırması: tek seferlik kuruluş ve tekrarlanan işletme giderleri ayrı. Teşvikler ve şartları, kaynaklı ve tarihli mevzuat parametreleri, mevzuat değişiklikleri zaman çizelgesi, kuruluş kontrol listesi. |
| Ayarlar & Yedek | Varsayımlar, JSON yedek alma ve geri yükleme, CSV dışa aktarma, sıfırlama. |

## Veri ve doğruluk ilkeleri

- Veriler tarayıcının `localStorage` alanında saklanır. Düzenli olarak **Ayarlar › Yedeği indir** ile yedek alın.
- Malzeme ve kuruluş maliyetleri boş gelir. Uygulama hiçbir fiyatı uydurmaz; siz kaynağıyla girersiniz.
- Mevzuat parametreleri (asgari ücret, Bağ-Kur oranı, genç girişimci istisnası vb.) 23.11.2026 itibarıyla basın ve meslek kaynaklarından derlenmiştir ve **"Doğrulanmalı"** olarak işaretlidir. GİB, SGK ve Ticaret Bakanlığı'ndan doğruladıktan sonra durumu güncelleyin.
- Vergi ve teşvik hesapları bilgilendirme amaçlıdır; mali müşavir görüşünün yerini tutmaz.
- Otomatik fiyat çekme için `src/lib/priceResearch.js` içinde bir sağlayıcı arayüzü vardır. Tarayıcı güvenlik kuralları (CORS) nedeniyle bunun için bir sunucu veya API anahtarı gerekir.

## Canlı site ve yayınlama

Site: **https://sudee20g-lgtm.github.io/bag-atelier/**

Değişiklikleri yayına almak için:

```powershell
npm run deploy
```

Bu komut siteyi derler ve `gh-pages` dalına gönderir; GitHub Pages yaklaşık bir dakika içinde güncellenir. Kaynak kodu ayrıca `git push` ile `main` dalına gönderin.
