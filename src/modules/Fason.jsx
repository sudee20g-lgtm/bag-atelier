import { useState } from 'react';
import { Plus, Factory, Pencil, Trash2, Copy } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useStore } from '../store.jsx';
import { fasonCost, ownCost, investment, bomCost } from '../lib/calc.js';
import { money, money0, number, uid, n } from '../lib/format.js';
import {
  PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Modal, Empty, Badge, Notice, Toggle, confirmDelete,
} from '../ui.jsx';
import { ProductPicker } from './OwnProduction.jsx';

const SCENARIOS = [20, 50, 100, 250, 500];

const blankQuote = () => ({
  id: uid(), workshop: '', productId: '', modelName: '', sampleFee: 0, patternFee: 0, unitSewing: 0,
  materialsByWorkshop: false, materialPerUnit: 0, moq: 0, orderQty: 100, packagingPerUnit: 0, shippingTotal: 0,
  qcPerUnit: 0, leadDays: 0, contact: '', notes: '',
});

function QuoteEditor({ initial, onClose }) {
  const { state, upsert } = useStore();
  const [q, setQ] = useState(initial);
  const set = (k) => (v) => setQ((x) => ({ ...x, [k]: v }));
  const product = state.products.find((p) => p.id === q.productId);
  const save = () => {
    if (!q.workshop.trim()) return alert('Atölye adı zorunludur.');
    upsert('workshops', { ...q, modelName: q.modelName || product?.name || '' });
    onClose();
  };
  return (
    <Modal open wide title={initial.workshop || 'Yeni fason teklifi'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save}>Kaydet</Button></>}>
      <div className="form-grid">
        <Field label="Atölye adı *"><TextInput value={q.workshop} onChange={set('workshop')} placeholder="ör. Merter Çanta Atölyesi" /></Field>
        <Field label="Ürün (kütüphaneden)"><ProductPicker value={q.productId} onChange={set('productId')} /></Field>
        <Field label="Model adı"><TextInput value={q.modelName} onChange={set('modelName')} placeholder={product?.name || 'Model adı'} /></Field>
        <Field label="İletişim"><TextInput value={q.contact} onChange={set('contact')} placeholder="Telefon / e-posta" /></Field>
        <Field label="Numune ücreti" hint="Tek seferlik"><NumberInput value={q.sampleFee} onChange={set('sampleFee')} suffix="₺" /></Field>
        <Field label="Kalıp ücreti" hint="Tek seferlik"><NumberInput value={q.patternFee} onChange={set('patternFee')} suffix="₺" /></Field>
        <Field label="Birim dikim ücreti"><NumberInput value={q.unitSewing} onChange={set('unitSewing')} suffix="₺" /></Field>
        <Field label="Paketleme ücreti (adet)"><NumberInput value={q.packagingPerUnit} onChange={set('packagingPerUnit')} suffix="₺" /></Field>
        <Field label="Kalite kontrol ücreti (adet)"><NumberInput value={q.qcPerUnit} onChange={set('qcPerUnit')} suffix="₺" /></Field>
        <Field label="Nakliye ücreti (sipariş başına)"><NumberInput value={q.shippingTotal} onChange={set('shippingTotal')} suffix="₺" /></Field>
        <Field label="Minimum sipariş miktarı (MOQ)"><NumberInput value={q.moq} onChange={set('moq')} suffix="adet" /></Field>
        <Field label="Sipariş adedi"><NumberInput value={q.orderQty} onChange={set('orderQty')} suffix="adet" /></Field>
        <Field label="Termin süresi"><NumberInput value={q.leadDays} onChange={set('leadDays')} suffix="gün" /></Field>
        <Field label="Malzemeler atölyeye mi ait?" wide>
          <Toggle checked={q.materialsByWorkshop} onChange={set('materialsByWorkshop')}
            label={q.materialsByWorkshop ? 'Evet — malzeme dikim ücretine dahil' : 'Hayır — malzemeyi ben sağlıyorum'} />
        </Field>
        {!q.materialsByWorkshop && (
          <Field label="Malzeme maliyeti (adet)" hint={product ? 'Ürün reçetesinden otomatik' : 'Ürün seçilmediyse elle girin'}>
            {product ? <div className="kpi-box" style={{ padding: '9px 12px' }}><strong>{money(bomCost(state, product).total)}</strong></div>
              : <NumberInput value={q.materialPerUnit} onChange={set('materialPerUnit')} suffix="₺" />}
          </Field>
        )}
        <Field label="Notlar" wide><textarea value={q.notes} onChange={(e) => set('notes')(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export default function Fason() {
  const { state, remove, upsert } = useStore();
  const [editing, setEditing] = useState(null);
  const [sel, setSel] = useState(state.workshops[0]?.id || '');
  const quote = state.workshops.find((w) => w.id === sel) || state.workshops[0];
  const product = quote && state.products.find((p) => p.id === quote.productId);
  const own = product ? ownCost(state, product) : null;
  const inv = investment(state);
  const qtys = quote ? [...new Set([...SCENARIOS, n(quote.orderQty)].filter((x) => x > 0))].sort((a, b) => a - b) : SCENARIOS;

  const rows = quote
    ? qtys.map((qty) => {
        const f = fasonCost(state, quote, qty);
        const ownEx = own ? own.withPackaging : null;
        const ownIn = own ? own.withPackaging + inv.total / qty : null;
        return { qty, f, ownEx, ownIn, hours: own ? own.hours * qty : null };
      })
    : [];
  const chart = rows.map((r) => ({
    adet: r.qty,
    Fason: Math.round(r.f.unit),
    ...(own ? { 'Kendim (yatırım dahil)': Math.round(r.ownIn), 'Kendim (yatırım hariç)': Math.round(r.ownEx) } : {}),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Modül 5"
        title="Fason Üretim Hesaplayıcısı"
        subtitle="Atölye tekliflerini kaydedin; 20–500 adet senaryolarını ve kendi üretiminizle karşılaştırmayı aynı ekranda görün."
        actions={<Button icon={Plus} onClick={() => setEditing(blankQuote())}>Yeni teklif</Button>}
      />

      {!state.workshops.length ? (
        <Card><Empty icon={Factory} title="Henüz atölye teklifi yok" text="Atölyeden aldığınız numune, kalıp ve birim dikim fiyatlarını girin."
          action={<Button icon={Plus} onClick={() => setEditing(blankQuote())}>Teklif ekle</Button>} /></Card>
      ) : (
        <>
          <Card title="Atölye teklifleri" pad={false}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Atölye</th><th>Model</th><th className="num">Numune + kalıp</th><th className="num">Birim dikim</th>
                    <th>Malzeme</th><th className="num">MOQ</th><th className="num">Sipariş</th><th className="num">Birim maliyet</th><th className="num">Termin</th><th />
                  </tr>
                </thead>
                <tbody>
                  {state.workshops.map((w) => {
                    const f = fasonCost(state, w, w.orderQty);
                    const active = quote?.id === w.id;
                    return (
                      <tr key={w.id} onClick={() => setSel(w.id)} style={{ cursor: 'pointer', background: active ? 'var(--bordeaux-soft)' : undefined }}>
                        <td><strong>{w.workshop}</strong>{active && <> <Badge tone="brand">Seçili</Badge></>}</td>
                        <td>{w.modelName || '—'}</td>
                        <td className="num">{money(n(w.sampleFee) + n(w.patternFee))}</td>
                        <td className="num">{money(w.unitSewing)}</td>
                        <td>{w.materialsByWorkshop ? <Badge tone="info">Atölyeden</Badge> : <Badge>Benden</Badge>}</td>
                        <td className="num">{number(w.moq)}</td>
                        <td className="num">{number(w.orderQty)} {f.belowMoq && <Badge tone="danger">MOQ altı</Badge>}</td>
                        <td className="num"><strong>{money(f.unit)}</strong></td>
                        <td className="num">{w.leadDays ? `${w.leadDays} gün` : '—'}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions">
                            <IconButton icon={Pencil} label="Düzenle" onClick={() => setEditing(structuredClone(w))} />
                            <IconButton icon={Copy} label="Kopyala" onClick={() => upsert('workshops', { ...structuredClone(w), id: uid(), workshop: `${w.workshop} (kopya)` })} />
                            <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete(`“${w.workshop}” teklifi`) && remove('workshops', w.id)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {quote && (
            <div className="grid g-2-1 mt">
              <Card title={`Adet senaryoları · ${quote.workshop}`} subtitle={`${quote.modelName || 'Model'} · Fason ve kendim üretim karşılaştırması`} pad={false}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Adet</th>
                        <th className="num">Fason toplam</th>
                        <th className="num">Fason birim</th>
                        <th className="num">Kendim birim (yatırım hariç)</th>
                        <th className="num">Kendim birim (yatırım dahil)</th>
                        <th className="num">Kendim süre</th>
                        <th>Daha uygun</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const fasonBest = r.ownIn === null || r.f.unit <= r.ownIn;
                        return (
                          <tr key={r.qty}>
                            <td>
                              <strong>{r.qty}</strong>{r.qty === n(quote.orderQty) && <> <Badge tone="brand">Sipariş</Badge></>}
                              {r.f.belowMoq && <div><Badge tone="danger">MOQ ({quote.moq}) altı</Badge></div>}
                            </td>
                            <td className="num">{money0(r.f.total)}</td>
                            <td className={`num ${own && fasonBest ? 'best-cell' : ''}`}>{money(r.f.unit)}</td>
                            <td className="num">{r.ownEx === null ? '—' : money(r.ownEx)}</td>
                            <td className={`num ${own && !fasonBest ? 'best-cell' : ''}`}>{r.ownIn === null ? '—' : money(r.ownIn)}</td>
                            <td className="num">{r.hours === null ? '—' : `${number(r.hours)} sa`}</td>
                            <td>{own ? (fasonBest ? <Badge tone="ok">Fason</Badge> : <Badge tone="brand">Kendim</Badge>) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="card-body">
                  {!product && <Notice tone="warn">Kendi üretiminizle karşılaştırmak için teklife kütüphaneden bir ürün bağlayın.</Notice>}
                  {product && (
                    <p className="tiny muted">
                      Kendim üretim: ürün reçetesi + enerji + işçilik + ambalaj; “yatırım dahil” sütununda {money(inv.total)} ekipman yatırımı o senaryonun adedine bölünür.
                      Kendi üretimde zaman kapasitesini (saat) de değerlendirin.
                    </p>
                  )}
                </div>
              </Card>

              <div className="stack">
                <Card title="Birim maliyet eğrisi">
                  <div className="chart-box">
                    <ResponsiveContainer>
                      <LineChart data={chart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eadfd4" />
                        <XAxis dataKey="adet" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => money0(v)} width={78} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => money(v)} labelFormatter={(l) => `${l} adet`} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="Fason" stroke="#7b2d3b" strokeWidth={2.5} dot />
                        {own && <Line type="monotone" dataKey="Kendim (yatırım dahil)" stroke="#d99aa5" strokeWidth={2.5} dot />}
                        {own && <Line type="monotone" dataKey="Kendim (yatırım hariç)" stroke="#b08d6e" strokeDasharray="5 4" dot={false} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Sipariş özeti">
                  {(() => {
                    const f = fasonCost(state, quote, quote.orderQty);
                    return (
                      <>
                        <div className="row-line"><span>Numune + kalıp + nakliye (sabit)</span><span>{money(f.fixed)}</span></div>
                        <div className="row-line"><span>Birim değişken maliyet</span><span>{money(f.perUnit)}</span></div>
                        <div className="row-line sub"><span>Malzeme</span><span>{quote.materialsByWorkshop ? 'Dikime dahil' : money(f.materialPerUnit)}</span></div>
                        <div className="row-line"><span>Sipariş adedi</span><span>{number(f.qty)}</span></div>
                        <div className="row-line total"><span>Sipariş toplamı</span><span>{money(f.total)}</span></div>
                        <div className="row-line"><span>Birim maliyet</span><span><strong>{money(f.unit)}</strong></span></div>
                        <div className="row-line"><span>Termin</span><span>{quote.leadDays ? `${quote.leadDays} gün` : '—'}</span></div>
                      </>
                    );
                  })()}
                </Card>
              </div>
            </div>
          )}
        </>
      )}
      {editing && <QuoteEditor initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
