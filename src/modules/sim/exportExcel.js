import * as XLSX from 'xlsx';
import { computeSim, SCENARIOS, SRC, KIND, FREQ, MODELS, COMPANY, WORKSPACES } from '../../lib/simulator.js';
import { today } from '../../lib/format.js';

const r2 = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : v ?? '');

function sheet(rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = widths.map((w) => ({ wch: w }));
  return ws;
}

export function exportExcel(state, sim) {
  const cfg = sim.scenarios[sim.active];
  const r = computeSim(state, cfg);
  const wb = XLSX.utils.book_new();
  const scen = SCENARIOS.find((s) => s.id === sim.active)?.label;

  XLSX.utils.book_append_sheet(wb, sheet([
    ['İş Kurma ve Maliyet Simülasyonu'],
    ['Simülasyon', sim.name],
    ['Senaryo', scen],
    ['Tarih', today().split('-').reverse().join('.')],
    ['İş modeli', MODELS.find((m) => m.id === r.cfg.model)?.label],
    ['Şirket türü', COMPANY.find((c) => c.id === r.cfg.company.type)?.label],
    ['Çalışma alanı', WORKSPACES.find((w) => w.id === r.cfg.workspace.type)?.label],
    [],
    ['FİNANSAL SONUÇ', 'Tutar (₺)'],
    ['İlk satışa kadar ihtiyaç duyulan toplam sermaye', r2(r.fin.capitalNeed)],
    ['Başlangıç yatırımı', r2(r.startupTotal)],
    ['İlk satışa kadar + rezerv sabit gider', r2(r.fin.runway)],
    ['Aylık sabit gider', r2(r.monthlyFixed)],
    ['Aylık toplam gider (sabit + değişken)', r2(r.fin.monthlyTotal)],
    ['Ürün başına toplam maliyet', r2(r.fin.unitTotal)],
    ['Önerilen satış fiyatı (KDV dahil)', r2(r.fin.suggestedPrice)],
    ['Başabaş satış fiyatı (KDV dahil)', r2(r.fin.breakEvenPrice)],
    ['Ürün başına tahmini net kâr', r2(r.fin.profitUnit)],
    ['Aylık başabaş satış adedi', r.fin.breakEvenUnits ?? '—'],
    ['Aylık ciro (KDV dahil) — kâr değildir', r2(r.fin.monthlyRevenue)],
    ['Aylık vergi öncesi kâr', r2(r.fin.monthlyPreTax)],
    ['Aylık vergi payı', r2(r.fin.monthlyTax)],
    ['Aylık tahmini net kâr', r2(r.fin.monthlyNet)],
    ['Yatırımın geri dönüş süresi (ay)', r.fin.payback ? r2(r.fin.payback) : 'Dönmüyor'],
    [],
    ['Uyarılar'],
    ...r.warnings.map((w) => [w]),
    ...(r.missingAmounts ? [[`${r.missingAmounts} kalemin tutarı girilmedi (0 ₺ olarak hesaplandı).`]] : []),
    [],
    ['Bu tablo karar desteği içindir; vergi ve SGK hesapları kesin mali/hukuki danışmanlık değildir.'],
  ], [52, 22]), 'Özet');

  const lineRows = (groups, valKey) => groups.flatMap((g) => [
    [g.label, '', '', '', '', r2(g.total)],
    ...g.lines.map((l) => ['', l.label, KIND[l.kind]?.label, SRC[l.src]?.label, FREQ[l.freq] || '', r2(l[valKey]), l.note || '']),
  ]);
  XLSX.utils.book_append_sheet(wb, sheet([
    ['Grup', 'Kalem', 'Tür', 'Kaynak', 'Sıklık', 'Tutar (₺)', 'Not'],
    ...lineRows(r.startupGroups, 'amount'),
    [],
    ['TOPLAM BAŞLANGIÇ YATIRIMI', '', '', '', '', r2(r.startupTotal)],
  ], [24, 44, 14, 18, 12, 14, 40]), 'Başlangıç yatırımı');

  XLSX.utils.book_append_sheet(wb, sheet([
    ['Grup', 'Kalem', 'Tür', 'Kaynak', 'Sıklık', 'Aylık karşılık (₺)', 'Not'],
    ...lineRows(r.monthlyGroups, 'monthly'),
    [],
    ['TOPLAM AYLIK SABİT GİDER', '', '', '', '', r2(r.monthlyFixed)],
  ], [24, 44, 14, 18, 12, 16, 50]), 'Aylık giderler');

  const u = r.unit;
  XLSX.utils.book_append_sheet(wb, sheet([
    ['Kalem', 'Tutar (₺)'],
    ['Satış fiyatı (KDV dahil)', r2(r.cfg.target.avgPrice)],
    ['KDV', r2(u.kdvAmount)],
    ['Net satış (KDV hariç)', r2(u.netSales)],
    ['Malzeme (fire dahil)', r2(u.material)],
    ['İşçilik', r2(u.labor)],
    ['Fason dikim, KK, paketleme, nakliye payı', r2(u.sewing)],
    ['Ambalaj', r2(u.packaging)],
    ['Kargo', r2(u.shipping)],
    ['Komisyon', r2(u.commission)],
    ['İade ve fire payı', r2(u.returns)],
    ['Diğer değişken', r2(u.otherVar)],
    ['Değişken maliyet toplamı', r2(u.variable)],
    ['Birim katkı payı', r2(u.contribution)],
    ['Sabit gider payı', r2(u.fixedPerUnit)],
    ['Vergi öncesi kâr', r2(u.preTaxUnit)],
    ['Vergi payı', r2(u.taxUnit)],
    ['Ürün başına net kâr', r2(u.profitUnit)],
    ['Bilgi: makine payı (maliyete eklenmedi)', r2(u.machineShare)],
  ], [46, 16]), 'Birim maliyet');

  XLSX.utils.book_append_sheet(wb, sheet([
    ['Malzeme', 'Birim', 'Çanta başına', 'Fire %', 'İhtiyaç', 'Stok', 'MOQ', 'Alınacak', 'Birim fiyat (₺)', 'Tutar (₺)', 'Satıcı', 'Bağlantı', 'Fiyat son kontrol'],
    ...[...r.purchases, ...r.packPurchases].map((x) => [
      x.material?.name, x.material?.unit, x.qty, x.waste || 0, r2(x.need), x.stock, x.material?.moq || 0, r2(x.buy),
      x.hasPrice ? x.material.price : 'Girilmedi', x.hasPrice ? r2(x.cost) : '', x.material?.supplier, x.material?.url, x.material?.updatedAt,
    ]),
  ], [26, 10, 12, 8, 10, 8, 8, 10, 14, 12, 20, 30, 14]), 'Malzeme alımı');

  const sc = SCENARIOS.map((s) => ({ s, r: sim.scenarios[s.id] ? computeSim(state, sim.scenarios[s.id]) : null }));
  XLSX.utils.book_append_sheet(wb, sheet([
    ['Ölçüt', ...sc.map((x) => x.s.label)],
    ['Toplam sermaye ihtiyacı', ...sc.map((x) => (x.r ? r2(x.r.fin.capitalNeed) : 'Oluşturulmadı'))],
    ['Başlangıç yatırımı', ...sc.map((x) => (x.r ? r2(x.r.startupTotal) : ''))],
    ['Aylık sabit gider', ...sc.map((x) => (x.r ? r2(x.r.monthlyFixed) : ''))],
    ['Aylık toplam gider', ...sc.map((x) => (x.r ? r2(x.r.fin.monthlyTotal) : ''))],
    ['Ürün başına toplam maliyet', ...sc.map((x) => (x.r ? r2(x.r.fin.unitTotal) : ''))],
    ['Ürün başına net kâr', ...sc.map((x) => (x.r ? r2(x.r.fin.profitUnit) : ''))],
    ['Aylık başabaş adedi', ...sc.map((x) => (x.r ? x.r.fin.breakEvenUnits ?? '—' : ''))],
    ['Geri dönüş (ay)', ...sc.map((x) => (x.r ? (x.r.fin.payback ? r2(x.r.fin.payback) : 'Dönmüyor') : ''))],
    ['Tutarı girilmemiş kalem', ...sc.map((x) => (x.r ? x.r.missingAmounts : ''))],
  ], [30, 22, 22, 22]), 'Senaryolar');

  XLSX.utils.book_append_sheet(wb, sheet([
    ['Parametre', 'Değer', 'Birim', 'Yürürlük', 'Kaynak', 'Durum'],
    ...state.params.map((p) => [p.label, p.value, p.unit, p.validFrom, p.source, p.status === 'dogrulandi' ? 'Doğrulandı' : 'Doğrulanmalı']),
  ], [44, 12, 8, 12, 60, 14]), 'Mevzuat parametreleri');

  const safe = (sim.name || 'simulasyon').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase();
  XLSX.writeFile(wb, `${safe}-${sim.active}-${today()}.xlsx`);
}
