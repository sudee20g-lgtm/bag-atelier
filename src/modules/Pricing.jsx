import { useState } from 'react';
import { Tags, Plus, X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { useStore } from '../store.jsx';
import { pricingConfig, priceBreakdown, ownCost, fasonCost, monthlyFixed } from '../lib/calc.js';
import { money, money0, number, pct, n } from '../lib/format.js';
import { go } from '../lib/nav.js';
import { PageHeader, Card, Field, NumberInput, Select, Empty, Button, Notice, Toggle, Badge, IconButton } from '../ui.jsx';
import { ProductPicker } from './OwnProduction.jsx';

const LINES = [
  ['P', 'Satış fiyatı (KDV dahil)', 'head'],
  ['kdvAmount', '− KDV', 'minus'],
  ['netSales', 'Net satış (KDV hariç)', 'strong'],
  ['unitCost', '− Birim üretim maliyeti', 'minus'],
  ['packaging', '− Ambalaj', 'minus'],
  ['shipping', '− Kargo', 'minus'],
  ['marketplace', '− Pazaryeri komisyonu', 'minus'],
  ['payment', '− Ödeme altyapısı komisyonu', 'minus'],
  ['ad', '− Reklam maliyeti', 'minus'],
  ['returns', '− İade ve fire payı', 'minus'],
  ['contribution', 'Birim katkı payı', 'strong'],
  ['fixedPerUnit', '− Sabit gider payı', 'minus'],
  ['preTax', 'Vergi öncesi kâr', 'strong'],
  ['taxReserve', '− Vergi için ayrılacak tutar', 'minus'],
  ['net', 'Tahmini net kâr / adet', 'total'],
];

export default function Pricing() {
  const { state, update } = useStore();
  const [pid, setPid] = useState(state.products[0]?.id || '');
  const [newPrice, setNewPrice] = useState(null);
  const product = state.products.find((p) => p.id === pid);

  if (!state.products.length) {
    return (
      <>
        <PageHeader eyebrow="Modül 9" title="Ürün Fiyatlandırma ve Kâr Hesaplama" />
        <Card><Empty icon={Tags} title="Önce bir ürün oluşturun" action={<Button onClick={() => go('urunler')}>Ürün kütüphanesi</Button>} /></Card>
      </>
    );
  }

  const cfg = pricingConfig(state, pid);
  const set = (k) => (v) => update((d) => { d.pricing[pid] = { ...pricingConfig(d, pid), [k]: v }; });
  const prices = [...new Set(cfg.testPrices.map(n).filter((x) => x > 0))].sort((a, b) => a - b);
  const results = prices.map((p) => priceBreakdown(state, pid, p, cfg));
  const target = n(cfg.salePrice) ? priceBreakdown(state, pid, cfg.salePrice, cfg) : null;
  const be = results[0]?.breakEvenPrice ?? priceBreakdown(state, pid, 1000, cfg).breakEvenPrice;
  const fixed = monthlyFixed(state).total;
  const quotes = state.workshops.filter((w) => w.productId === pid);
  const own = product ? ownCost(state, product) : null;

  const chart = results.map((r) => ({
    fiyat: money0(r.P),
    'Maliyet + giderler': Math.round(r.variable + r.kdvAmount + r.fixedPerUnit + r.taxReserve),
    'Net kâr': Math.round(r.net),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Modül 9"
        title="Ürün Fiyatlandırma ve Kâr Hesaplama"
        subtitle="Farklı satış fiyatlarında elinizde gerçekten ne kaldığını görün. Ciro kâr değildir: KDV, maliyet, komisyon ve vergi payı tek tek düşülür."
      />

      <div className="grid g-1-2">
        <div className="stack">
          <Card title="Ürün ve maliyet kaynağı">
            <div className="form-grid cols-2">
              <Field label="Ürün" wide><ProductPicker value={pid} onChange={setPid} /></Field>
              <Field label="Birim maliyet kaynağı" wide>
                <Select value={cfg.costSource} onChange={set('costSource')} options={[
                  { value: 'kendim', label: `Kendim üretirsem (${own ? money(own.productionCost) : '—'})` },
                  { value: 'fason', label: 'Fason teklifi' },
                  { value: 'manuel', label: 'Elle gir' },
                ]} />
              </Field>
              {cfg.costSource === 'fason' && (
                <>
                  <Field label="Teklif">
                    <Select value={cfg.fasonQuoteId} onChange={set('fasonQuoteId')} placeholder={quotes.length ? 'Seçin' : 'Bu ürüne bağlı teklif yok'}
                      options={quotes.map((q) => ({ value: q.id, label: q.workshop }))} />
                  </Field>
                  <Field label="Sipariş adedi"><NumberInput value={cfg.fasonQty} onChange={set('fasonQty')} suffix="adet" /></Field>
                  {cfg.fasonQuoteId && quotes.find((q) => q.id === cfg.fasonQuoteId) && (
                    <p className="tiny muted field wide">Fason birim maliyet: {money(fasonCost(state, quotes.find((q) => q.id === cfg.fasonQuoteId), cfg.fasonQty).unit)} (ambalaj ücreti dahil olabilir; aşağıdaki ambalajı buna göre ayarlayın)</p>
                  )}
                </>
              )}
              {cfg.costSource === 'manuel' && <Field label="Birim maliyet" wide><NumberInput value={cfg.manualCost} onChange={set('manualCost')} suffix="₺" /></Field>}
            </div>
          </Card>

          <Card title="Satış giderleri ve vergiler" subtitle="Adet başına">
            <div className="form-grid cols-2">
              <Field label="Ambalaj" hint={`Boşsa üründen: ${money(product?.packagingCost)}`}><NumberInput value={cfg.packaging} allowNull onChange={set('packaging')} suffix="₺" /></Field>
              <Field label="Kargo"><NumberInput value={cfg.shipping} onChange={set('shipping')} suffix="₺" /></Field>
              <Field label="Pazaryeri komisyonu" hint="Satış fiyatı üzerinden"><NumberInput value={cfg.marketplacePct} onChange={set('marketplacePct')} suffix="%" /></Field>
              <Field label="Ödeme altyapısı komisyonu"><NumberInput value={cfg.paymentPct} onChange={set('paymentPct')} suffix="%" /></Field>
              <Field label="Reklam maliyeti (adet başı)"><NumberInput value={cfg.adPerUnit} onChange={set('adPerUnit')} suffix="₺" /></Field>
              <Field label="İade ve fire payı" hint="Net satışın yüzdesi"><NumberInput value={cfg.returnPct} onChange={set('returnPct')} suffix="%" /></Field>
              <Field label="KDV oranı"><NumberInput value={cfg.kdvRate} onChange={set('kdvRate')} suffix="%" /></Field>
              <Field label="Vergi için ayrılacak oran" hint="Kâr üzerinden ihtiyat payı"><NumberInput value={cfg.taxPct} onChange={set('taxPct')} suffix="%" /></Field>
              <Field label="Sabit giderleri dağıt" wide>
                <Toggle checked={cfg.includeFixed} onChange={set('includeFixed')} label={`Aylık ${money0(fixed)} sabit gideri satışlara böl`} />
              </Field>
              {cfg.includeFixed && (
                <Field label="Aylık beklenen satış adedi (tüm ürünler)" wide hint="Sabit gider payı = aylık sabit gider ÷ bu adet">
                  <NumberInput value={cfg.monthlyUnits} onChange={set('monthlyUnits')} suffix="adet" />
                </Field>
              )}
            </div>
          </Card>
        </div>

        <div className="stack">
          <div className="kpi-compare">
            <div className="kpi-box">
              <div className="k-label">Birim üretim maliyeti</div>
              <div className="k-value">{money(results[0]?.unitCost ?? 0)}</div>
            </div>
            <div className="kpi-box">
              <div className="k-label">Başabaş satış fiyatı (KDV dahil)</div>
              <div className="k-value">{be === null ? '—' : money(be)}</div>
              <div className="tiny muted">Bu fiyatın altında her satış zarar</div>
            </div>
            <div className="kpi-box">
              <div className="k-label">Belirlenen satış fiyatı</div>
              <NumberInput value={cfg.salePrice} onChange={set('salePrice')} suffix="₺" />
              <div className="tiny muted mt">Panel’deki başabaş hesabında kullanılır</div>
            </div>
          </div>

          {results.some((r) => r.unitCost === 0) && (
            <Notice tone="warn">Birim maliyet 0 görünüyor — ürün reçetesini ve malzeme fiyatlarını kontrol edin, yoksa kâr olduğundan yüksek görünür.</Notice>
          )}

          <Card title="Fiyat senaryoları" subtitle="Fiyat ekleyip çıkarabilirsiniz" pad={false}
            actions={
              <div className="hstack" style={{ flexWrap: 'nowrap' }}>
                <div style={{ width: 120 }} className="cell-input"><NumberInput value={newPrice} allowNull onChange={setNewPrice} suffix="₺" placeholder="Fiyat" /></div>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => { if (n(newPrice) > 0) { set('testPrices')([...cfg.testPrices, n(newPrice)]); setNewPrice(null); } }}>Ekle</Button>
              </div>
            }>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Kalem</th>
                    {results.map((r) => (
                      <th key={r.P} className="num">
                        <span className="hstack" style={{ justifyContent: 'flex-end', gap: 2 }}>
                          {money0(r.P)}
                          <IconButton icon={X} label="Kaldır" onClick={() => set('testPrices')(cfg.testPrices.filter((x) => n(x) !== r.P))} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LINES.map(([k, label, kind]) => (
                    <tr key={k} style={kind === 'total' ? { background: 'var(--bordeaux-soft)' } : undefined}>
                      <td style={{ fontWeight: kind === 'minus' ? 500 : 800, paddingLeft: kind === 'minus' ? 24 : 12, color: kind === 'total' ? 'var(--bordeaux)' : undefined }}>{label}</td>
                      {results.map((r) => (
                        <td key={r.P} className={`num ${kind === 'total' || k === 'contribution' ? (r[k] < 0 ? 'neg-text' : 'pos-text') : ''}`} style={{ fontWeight: kind === 'minus' ? 500 : 800 }}>
                          {money(r[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 700 }}>Net kâr marjı (net satışa göre)</td>
                    {results.map((r) => <td key={r.P} className="num"><Badge tone={r.marginPct < 0 ? 'danger' : r.marginPct < 15 ? 'warn' : 'ok'}>{pct(r.marginPct)}</Badge></td>)}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700 }}>Katkı payı oranı</td>
                    {results.map((r) => <td key={r.P} className="num">{pct(r.contributionPct)}</td>)}
                  </tr>
                  {cfg.includeFixed && fixed > 0 && (
                    <tr>
                      <td style={{ fontWeight: 700 }}>Aylık başabaş adedi</td>
                      {results.map((r) => <td key={r.P} className="num">{r.contribution > 0 ? `${number(Math.ceil(fixed / r.contribution))} adet` : '—'}</td>)}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Fiyat başına dağılım">
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eadfd4" vertical={false} />
                  <XAxis dataKey="fiyat" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => money0(v)} width={78} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#9a8a8d" />
                  <Bar dataKey="Maliyet + giderler" stackId="a" fill="#e7bfc0" />
                  <Bar dataKey="Net kâr" stackId="a" fill="#7b2d3b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {target && (
            <Card title={`Belirlenen fiyat: ${money(target.P)}`}>
              <p className="small">
                Her satışta müşteriden <strong>{money(target.P)}</strong> tahsil edilir; bunun <strong>{money(target.kdvAmount)}</strong>’si KDV olarak devlete,
                <strong> {money(target.variable)}</strong>’si maliyet ve satış giderlerine gider. Sabit gider payı ve vergi ihtiyatı sonrası tahmini
                <strong className={target.net < 0 ? 'neg-text' : 'pos-text'}> {money(target.net)}</strong> kalır ({pct(target.marginPct)}).
              </p>
            </Card>
          )}
          <p className="tiny muted">
            Vergi payı ihtiyat amaçlıdır; gerçek gelir/kurumlar vergisi yıllık kâr üzerinden, istisna ve indirimlerle hesaplanır. Komisyon faturalarındaki KDV indirimi bu hesapta dikkate alınmamıştır.
          </p>
        </div>
      </div>
    </>
  );
}
