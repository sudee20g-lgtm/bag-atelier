import { useState } from 'react';
import { Plus, Trash2, Pencil, PackageCheck } from 'lucide-react';
import { useStore } from '../store.jsx';
import { ownCost, fasonCost, stockByProduct, pricingConfig, priceBreakdown } from '../lib/calc.js';
import { money, date, today, uid, n, number } from '../lib/format.js';
import { PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Select, Modal, Tabs, Empty, Badge, Toggle, Notice, confirmDelete } from '../ui.jsx';
import { ProductPicker } from './OwnProduction.jsx';

const CHANNELS = ['Kendi web sitem', 'Trendyol', 'Hepsiburada', 'Etsy', 'Instagram / DM', 'Pazar / stand', 'Toptan', 'Diğer'];

function ProductionEditor({ initial, onClose }) {
  const { state, update } = useStore();
  const [r, setR] = useState(initial);
  const [toLedger, setToLedger] = useState(initial._new && initial.method === 'fason');
  const set = (k) => (v) => setR((x) => ({ ...x, [k]: v }));
  const product = state.products.find((p) => p.id === r.productId);
  const quotes = state.workshops.filter((w) => !r.productId || w.productId === r.productId);

  const suggest = () => {
    if (!product) return;
    if (r.method === 'kendim') set('unitCost')(Math.round(ownCost(state, product).withPackaging * 100) / 100);
    else {
      const q = state.workshops.find((w) => w.id === r.quoteId);
      if (q) set('unitCost')(Math.round(fasonCost(state, q, r.qty || q.orderQty).unit * 100) / 100);
    }
  };

  const save = () => {
    if (!r.productId || !n(r.qty)) return alert('Ürün ve adet zorunludur.');
    const { _new, ...rec } = r;
    update((d) => {
      const i = d.production.findIndex((x) => x.id === rec.id);
      if (i >= 0) d.production[i] = rec;
      else d.production.push(rec);
      if (toLedger) {
        d.ledger.push({
          id: uid(), date: rec.date, category: rec.method === 'fason' ? 'fason' : 'malzeme',
          description: `${product?.name || 'Ürün'} üretimi · ${rec.qty} adet`, amount: n(rec.qty) * n(rec.unitCost), supplier: '', note: 'Üretim kaydından oluşturuldu',
        });
      }
    });
    onClose();
  };

  return (
    <Modal open title={initial._new ? 'Üretim kaydı' : 'Üretim kaydını düzenle'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save}>Kaydet</Button></>}>
      <div className="form-grid cols-2">
        <Field label="Tarih"><input type="date" value={r.date} onChange={(e) => set('date')(e.target.value)} /></Field>
        <Field label="Ürün"><ProductPicker value={r.productId} onChange={set('productId')} /></Field>
        <Field label="Adet"><NumberInput value={r.qty} onChange={set('qty')} suffix="adet" /></Field>
        <Field label="Üretim yöntemi">
          <Select value={r.method} onChange={set('method')} options={[{ value: 'kendim', label: 'Kendim ürettim' }, { value: 'fason', label: 'Fason (atölye)' }]} />
        </Field>
        {r.method === 'fason' && (
          <Field label="Atölye teklifi" wide>
            <Select value={r.quoteId} onChange={set('quoteId')} placeholder="Seçin (opsiyonel)" options={quotes.map((q) => ({ value: q.id, label: `${q.workshop} · ${q.modelName}` }))} />
          </Field>
        )}
        <Field label="Gerçekleşen birim maliyet" wide hint="Hesaplanan değeri öneri olarak alabilir, gerçek tutarla değiştirebilirsiniz">
          <div className="hstack" style={{ flexWrap: 'nowrap' }}>
            <div style={{ flex: 1 }}><NumberInput value={r.unitCost} onChange={set('unitCost')} suffix="₺" /></div>
            <Button variant="secondary" size="sm" onClick={suggest} disabled={!product}>Hesaplananı al</Button>
          </div>
        </Field>
        <Field label="Not" wide><TextInput value={r.note} onChange={set('note')} /></Field>
        {initial._new && (
          <Field label="Harcama kaydı" wide>
            <Toggle checked={toLedger} onChange={setToLedger} label={`Toplam ${money(n(r.qty) * n(r.unitCost))} harcamalara da eklensin`} />
            <span className="field-hint">Malzemeleri ayrıca “Harcamalar”a girdiyseniz çift sayım olmaması için kapalı bırakın.</span>
          </Field>
        )}
      </div>
    </Modal>
  );
}

function SaleEditor({ initial, onClose }) {
  const { state, update } = useStore();
  const [r, setR] = useState(initial);
  const set = (k) => (v) => setR((x) => ({ ...x, [k]: v }));
  const stock = stockByProduct(state).find((s) => s.id === r.productId);

  const estimate = () => {
    if (!r.productId) return;
    const cfg = pricingConfig(state, r.productId);
    const b = priceBreakdown(state, r.productId, r.unitPrice, cfg);
    set('extraCosts')(Math.round((b.marketplace + b.payment + b.shipping + b.packaging + b.ad) * n(r.qty) * 100) / 100);
  };

  const save = () => {
    if (!r.productId || !n(r.qty)) return alert('Ürün ve adet zorunludur.');
    const { _new, ...rec } = r;
    update((d) => {
      const i = d.sales.findIndex((x) => x.id === rec.id);
      if (i >= 0) d.sales[i] = rec;
      else d.sales.push(rec);
    });
    onClose();
  };

  return (
    <Modal open title={initial._new ? 'Satış kaydı' : 'Satışı düzenle'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save}>Kaydet</Button></>}>
      <div className="form-grid cols-2">
        <Field label="Tarih"><input type="date" value={r.date} onChange={(e) => set('date')(e.target.value)} /></Field>
        <Field label="Ürün" hint={stock ? `Stok: ${stock.stock} adet` : ''}><ProductPicker value={r.productId} onChange={set('productId')} /></Field>
        <Field label="Adet"><NumberInput value={r.qty} onChange={set('qty')} suffix="adet" /></Field>
        <Field label="Birim satış fiyatı (KDV dahil)"><NumberInput value={r.unitPrice} onChange={set('unitPrice')} suffix="₺" /></Field>
        <Field label="Satış kanalı"><Select value={r.channel} onChange={set('channel')} options={CHANNELS} /></Field>
        <Field label="Satış giderleri (toplam)" hint="Komisyon, ödeme, kargo, ambalaj">
          <div className="hstack" style={{ flexWrap: 'nowrap' }}>
            <div style={{ flex: 1 }}><NumberInput value={r.extraCosts} onChange={set('extraCosts')} suffix="₺" /></div>
            <Button variant="secondary" size="sm" onClick={estimate} disabled={!r.productId}>Tahmin et</Button>
          </div>
        </Field>
        <Field label="Not" wide><TextInput value={r.note} onChange={set('note')} /></Field>
      </div>
      {stock && n(r.qty) > stock.stock + (initial._new ? 0 : n(initial.qty)) && (
        <Notice tone="warn">Bu satış adedi mevcut stoktan fazla. Önce üretim kaydı girmeniz gerekebilir.</Notice>
      )}
      <p className="tiny muted mt">Ciro = adet × fiyat ({money(n(r.qty) * n(r.unitPrice))}). Ciro kâr değildir; kâr panelde maliyet ve giderler düşülerek hesaplanır.</p>
    </Modal>
  );
}

export default function Records() {
  const { state, remove } = useStore();
  const [tab, setTab] = useState('uretim');
  const [prod, setProd] = useState(null);
  const [sale, setSale] = useState(null);
  const pname = (id) => state.products.find((p) => p.id === id)?.name || 'Silinmiş ürün';

  const newProd = () => setProd({ _new: true, id: uid(), date: today(), productId: state.products[0]?.id || '', qty: 0, method: 'kendim', quoteId: '', unitCost: 0, note: '' });
  const newSale = () => setSale({ _new: true, id: uid(), date: today(), productId: state.products[0]?.id || '', qty: 1, unitPrice: n(pricingConfig(state, state.products[0]?.id).salePrice), channel: CHANNELS[0], extraCosts: 0, note: '' });

  const production = [...state.production].sort((a, b) => b.date.localeCompare(a.date));
  const sales = [...state.sales].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader
        eyebrow="Üretim & Satış"
        title="Üretim ve Satış Kayıtları"
        subtitle="Panel’deki üretim adedi, stok, ciro ve kâr bu kayıtlardan hesaplanır."
        actions={
          <>
            <Button variant="secondary" icon={Plus} onClick={newProd} disabled={!state.products.length}>Üretim</Button>
            <Button icon={Plus} onClick={newSale} disabled={!state.products.length}>Satış</Button>
          </>
        }
      />
      {!state.products.length && <Notice tone="warn">Kayıt girebilmek için önce <a href="#/urunler">ürün kütüphanesine</a> bir model ekleyin.</Notice>}

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'uretim', label: 'Üretim', count: state.production.length },
        { value: 'satis', label: 'Satış', count: state.sales.length },
        { value: 'stok', label: 'Stok' },
      ]} />

      {tab === 'uretim' && (
        <Card pad={false}>
          {production.length === 0 ? <Empty icon={PackageCheck} title="Üretim kaydı yok" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tarih</th><th>Ürün</th><th>Yöntem</th><th className="num">Adet</th><th className="num">Birim maliyet</th><th className="num">Toplam</th><th>Not</th><th /></tr></thead>
                <tbody>
                  {production.map((r) => (
                    <tr key={r.id}>
                      <td>{date(r.date)}</td>
                      <td><strong>{pname(r.productId)}</strong></td>
                      <td><Badge tone={r.method === 'fason' ? 'info' : 'brand'}>{r.method === 'fason' ? 'Fason' : 'Kendim'}</Badge></td>
                      <td className="num">{number(r.qty)}</td>
                      <td className="num">{money(r.unitCost)}</td>
                      <td className="num"><strong>{money(n(r.qty) * n(r.unitCost))}</strong></td>
                      <td className="small muted">{r.note}</td>
                      <td><div className="row-actions">
                        <IconButton icon={Pencil} label="Düzenle" onClick={() => setProd(structuredClone(r))} />
                        <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete('Üretim kaydı') && remove('production', r.id)} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'satis' && (
        <Card pad={false}>
          {sales.length === 0 ? <Empty icon={PackageCheck} title="Satış kaydı yok" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tarih</th><th>Ürün</th><th>Kanal</th><th className="num">Adet</th><th className="num">Birim fiyat</th><th className="num">Ciro</th><th className="num">Satış gid.</th><th /></tr></thead>
                <tbody>
                  {sales.map((r) => (
                    <tr key={r.id}>
                      <td>{date(r.date)}</td>
                      <td><strong>{pname(r.productId)}</strong></td>
                      <td>{r.channel}</td>
                      <td className="num">{number(r.qty)}</td>
                      <td className="num">{money(r.unitPrice)}</td>
                      <td className="num"><strong>{money(n(r.qty) * n(r.unitPrice))}</strong></td>
                      <td className="num">{money(r.extraCosts)}</td>
                      <td><div className="row-actions">
                        <IconButton icon={Pencil} label="Düzenle" onClick={() => setSale(structuredClone(r))} />
                        <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete('Satış kaydı') && remove('sales', r.id)} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'stok' && (
        <Card pad={false}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Ürün</th><th className="num">Üretilen</th><th className="num">Satılan</th><th className="num">Stok</th></tr></thead>
              <tbody>
                {stockByProduct(state).map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td className="num">{s.produced}</td>
                    <td className="num">{s.sold}</td>
                    <td className="num"><Badge tone={s.stock <= 0 ? 'danger' : s.stock < 5 ? 'warn' : 'ok'}>{s.stock}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {prod && <ProductionEditor initial={prod} onClose={() => setProd(null)} />}
      {sale && <SaleEditor initial={sale} onClose={() => setSale(null)} />}
    </>
  );
}
