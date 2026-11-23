import { useRef } from 'react';
import { Download, Upload, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../store.jsx';
import { MATERIAL_CATEGORIES } from '../lib/seed.js';
import { today } from '../lib/format.js';
import { PageHeader, Card, Field, TextInput, NumberInput, Button, Notice } from '../ui.jsx';

const download = (name, content, type) => {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

const csv = (rows) => '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');

export default function Settings() {
  const { state, update, replaceAll, reset } = useStore();
  const file = useRef();
  const s = state.settings;
  const set = (k) => (v) => update((d) => { d.settings[k] = v; });

  const onImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data || !Array.isArray(data.materials) || !data.settings) throw new Error();
        if (window.confirm('Mevcut tüm veriler yedekteki verilerle değiştirilecek. Devam edilsin mi?')) replaceAll(data);
      } catch {
        alert('Dosya geçerli bir Bag Atelier yedeği değil.');
      }
      e.target.value = '';
    };
    r.readAsText(f);
  };

  return (
    <>
      <PageHeader eyebrow="Ayarlar" title="Ayarlar ve Yedekleme" subtitle="Marka bilgileri, genel varsayımlar ve veri yedeği." />
      <div className="grid g2">
        <Card title="Marka ve sermaye">
          <div className="form-grid cols-2">
            <Field label="Marka adı" wide><TextInput value={s.brandName} onChange={set('brandName')} /></Field>
            <Field label="Toplam başlangıç sermayesi"><NumberInput value={s.capital} onChange={set('capital')} suffix="₺" /></Field>
            <Field label="İşletme başlangıç tarihi" hint="Sabit giderlerin dönem hesabı için"><input type="date" value={s.startDate} onChange={(e) => set('startDate')(e.target.value)} /></Field>
          </div>
        </Card>
        <Card title="Üretim varsayımları">
          <div className="form-grid cols-2">
            <Field label="Saatlik işçilik değeri"><NumberInput value={s.hourlyRate} onChange={set('hourlyRate')} suffix="₺/sa" /></Field>
            <Field label="Elektrik birim fiyatı"><NumberInput value={s.electricityTariff} onChange={set('electricityTariff')} suffix="₺/kWh" /></Field>
            <Field label="Ortalama makine gücü"><NumberInput value={s.machinePowerW} onChange={set('machinePowerW')} suffix="W" /></Field>
            <Field label="Yatırımın dağıtılacağı adet"><NumberInput value={s.amortizationUnits} onChange={set('amortizationUnits')} suffix="adet" /></Field>
            <Field label="Varsayılan fire oranı" hint="Yeni reçete satırları için"><NumberInput value={s.defaultWaste} onChange={set('defaultWaste')} suffix="%" /></Field>
            <Field label="Fiyat eskime süresi" hint="Bu süreden eski fiyatlar “Güncel değil” olur"><NumberInput value={s.staleDays} onChange={set('staleDays')} suffix="gün" /></Field>
            <Field label="Panel vergi ihtiyat oranı" hint="Tahmini net kâr hesabı için"><NumberInput value={s.taxReservePct} onChange={set('taxReservePct')} suffix="%" /></Field>
          </div>
        </Card>
        <Card title="Yedekleme" subtitle="Veriler yalnızca bu tarayıcıda saklanır">
          <Notice tone="warn">Tarayıcı verilerini temizlerseniz veya başka cihaza geçerseniz kayıtlar kaybolur. Düzenli olarak JSON yedeği alın.</Notice>
          <div className="hstack mt">
            <Button icon={Download} onClick={() => download(`bag-atelier-yedek-${today()}.json`, JSON.stringify(state, null, 2), 'application/json')}>Yedeği indir (JSON)</Button>
            <Button variant="secondary" icon={Upload} onClick={() => file.current.click()}>Yedekten geri yükle</Button>
            <input ref={file} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImport} />
          </div>
        </Card>
        <Card title="Dışa aktarma (Excel uyumlu CSV)">
          <div className="hstack">
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => download(`malzemeler-${today()}.csv`, csv([
              ['Kategori', 'Malzeme', 'Birim fiyat (₺)', 'Birim', 'Satıcı', 'Alınan miktar', 'Son güncelleme', 'Kaynak türü', 'Bağlantı', 'Açıklama'],
              ...state.materials.map((m) => [MATERIAL_CATEGORIES.find((c) => c.id === m.category)?.label, m.name, m.price ?? '', m.unit, m.supplier, m.purchasedQty, m.updatedAt, m.priceSource, m.url, m.description]),
            ]), 'text/csv')}>Malzeme kataloğu</Button>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => download(`harcamalar-${today()}.csv`, csv([
              ['Tarih', 'Kategori', 'Açıklama', 'Satıcı', 'Tutar (₺)'],
              ...state.ledger.map((t) => [t.date, t.category, t.description, t.supplier, t.amount]),
            ]), 'text/csv')}>Harcamalar</Button>
            <Button variant="secondary" icon={FileSpreadsheet} onClick={() => download(`satislar-${today()}.csv`, csv([
              ['Tarih', 'Ürün', 'Kanal', 'Adet', 'Birim fiyat (₺)', 'Ciro (₺)', 'Satış giderleri (₺)'],
              ...state.sales.map((x) => [x.date, state.products.find((p) => p.id === x.productId)?.name, x.channel, x.qty, x.unitPrice, x.qty * x.unitPrice, x.extraCosts]),
            ]), 'text/csv')}>Satışlar</Button>
          </div>
        </Card>
        <Card title="Sıfırla">
          <p className="small muted">Tüm ürünler, fiyatlar ve kayıtlar silinir; uygulama ilk kurulum haline döner.</p>
          <Button variant="danger" icon={RotateCcw} className="mt" onClick={() => {
            if (window.confirm('TÜM veriler kalıcı olarak silinecek. Önce yedek almanız önerilir. Emin misiniz?')) reset();
          }}>Tüm verileri sıfırla</Button>
        </Card>
      </div>
    </>
  );
}
