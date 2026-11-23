import { useState } from 'react';
import { Scissors, Wrench } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useStore } from '../store.jsx';
import { ownCost, investment } from '../lib/calc.js';
import { MATERIAL_CATEGORIES } from '../lib/seed.js';
import { money, number, n } from '../lib/format.js';
import { go } from '../lib/nav.js';
import { PageHeader, Card, Field, NumberInput, Select, Row, Empty, Button, Badge, Notice } from '../ui.jsx';

const COLORS = ['#7b2d3b', '#d99aa5', '#b08d6e', '#3d2a2e', '#e7bfc0', '#a8706a'];

export function ProductPicker({ value, onChange }) {
  const { state } = useStore();
  return (
    <Select value={value} onChange={onChange} placeholder="Ürün seçin…"
      options={state.products.map((p) => ({ value: p.id, label: `${p.name}${p.code ? ` · ${p.code}` : ''}` }))} />
  );
}

export default function OwnProduction() {
  const { state, update } = useStore();
  const [pid, setPid] = useState(state.products[0]?.id || '');
  const product = state.products.find((p) => p.id === pid);
  const s = state.settings;
  const setS = (k) => (v) => update((d) => { d.settings[k] = v; });
  const inv = investment(state);

  if (!state.products.length) {
    return (
      <>
        <PageHeader eyebrow="Modül 4" title="Kendim Üretirsem Maliyetim" />
        <Card><Empty icon={Scissors} title="Önce bir ürün oluşturun" text="Maliyet hesabı, ürünün malzeme reçetesine göre yapılır."
          action={<Button onClick={() => go('urunler')}>Ürün kütüphanesine git</Button>} /></Card>
      </>
    );
  }

  const c = product ? ownCost(state, product) : null;
  const pie = c
    ? [
        ...MATERIAL_CATEGORIES.map((mc) => ({ name: mc.label, value: c.bom.byCategory[mc.id] || 0 })),
        { name: 'Elektrik', value: c.electricity },
        { name: 'İşçilik', value: c.labor },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Modül 4"
        title="Kendim Üretirsem Maliyetim"
        subtitle="Çantayı kendiniz diktiğinizde oluşan malzeme, fire, enerji ve işçilik maliyeti. Ekipmanlar ilk yatırım olarak ayrı tutulur."
      />

      <div className="grid g-1-2">
        <div className="stack">
          <Card title="Ürün ve varsayımlar" subtitle="Varsayımlar tüm ürünler için geçerlidir">
            <div className="form-grid cols-2">
              <Field label="Ürün" wide><ProductPicker value={pid} onChange={setPid} /></Field>
              <Field label="Saatlik işçilik değeri" hint="Kendi emeğinizin saat ücreti"><NumberInput value={s.hourlyRate} onChange={setS('hourlyRate')} suffix="₺/sa" /></Field>
              <Field label="Elektrik birim fiyatı" hint="Faturanızdaki ₺/kWh"><NumberInput value={s.electricityTariff} onChange={setS('electricityTariff')} suffix="₺/kWh" /></Field>
              <Field label="Ortalama makine gücü" hint="Makine + ütü + aydınlatma"><NumberInput value={s.machinePowerW} onChange={setS('machinePowerW')} suffix="W" /></Field>
              <Field label="Yatırımın dağıtılacağı adet" hint="Ekipman kaç çantaya bölünsün?"><NumberInput value={s.amortizationUnits} onChange={setS('amortizationUnits')} suffix="adet" /></Field>
              {product && (
                <Field label="Bu ürünün üretim süresi" wide>
                  <NumberInput value={product.productionHours} suffix="saat"
                    onChange={(v) => update((d) => { d.products.find((x) => x.id === pid).productionHours = v; })} />
                </Field>
              )}
            </div>
          </Card>

          <Card title="İlk yatırım (ekipman)" subtitle="“Planlandı” veya “Alındı” durumundaki ekipmanlar"
            actions={<Button variant="ghost" size="sm" icon={Wrench} onClick={() => go('ekipman')}>Ekipmanlar</Button>}>
            {inv.items.length ? (
              <>
                {inv.items.map((e) => (
                  <Row key={e.id} label={`${e.name}${e.brand ? ` · ${e.brand}` : ''}`} value={e.price === null ? <Badge tone="warn">Fiyat yok</Badge> : money(e.price)} />
                ))}
                <div className="row-line total"><span>Toplam ilk yatırım</span><span>{money(inv.total)}</span></div>
                {inv.missing > 0 && <p className="tiny muted mt">{inv.missing} ekipmanın fiyatı eksik.</p>}
              </>
            ) : (
              <p className="muted small">Henüz planlanan ekipman yok. Ekipman modülünde durumu “Planlandı” yapın.</p>
            )}
          </Card>
        </div>

        <div className="stack">
          {!product ? (
            <Card><Empty title="Ürün seçin" /></Card>
          ) : (
            <>
              {c.incomplete && (
                <Notice tone="warn" title="Hesap eksik olabilir">
                  {product.bom.length === 0 ? 'Bu ürünün malzeme reçetesi boş. ' : `${c.bom.missing} malzemenin fiyatı katalogda girilmemiş. `}
                  <a href="#/urunler">Ürünü düzenleyin</a> veya <a href="#/malzemeler">fiyatları girin</a>.
                </Notice>
              )}
              <div className="kpi-compare">
                <div className="kpi-box">
                  <div className="k-label">Birim maliyet · ilk yatırım HARİÇ</div>
                  <div className="k-value">{money(c.withPackaging)}</div>
                  <div className="tiny muted">Malzeme + enerji + işçilik + ambalaj</div>
                </div>
                <div className="kpi-box">
                  <div className="k-label">Birim maliyet · ilk yatırım DAHİL</div>
                  <div className="k-value">{money(c.withInvestment)}</div>
                  <div className="tiny muted">+ {money(c.invPerUnit)} / adet ({number(c.amortUnits)} adede bölündü)</div>
                </div>
                <div className="kpi-box">
                  <div className="k-label">Toplam süre / adet</div>
                  <div className="k-value">{number(c.hours)} sa</div>
                  <div className="tiny muted">Ayda 160 saatte ≈ {c.hours ? number(Math.floor(160 / c.hours)) : '—'} adet</div>
                </div>
              </div>

              <div className="grid g2">
                <Card title="Maliyet kırılımı">
                  {MATERIAL_CATEGORIES.map((mc) => {
                    const lines = c.bom.lines.filter((l) => l.material?.category === mc.id);
                    if (!lines.length) return null;
                    return (
                      <div key={mc.id}>
                        <Row label={mc.label} value={money(c.bom.byCategory[mc.id])} strong />
                        {lines.map((l) => (
                          <Row key={l.id} sub
                            label={`${l.material.name} · ${number(l.qty)} ${l.material.unit}${l.waste ? ` + %${number(l.waste)} fire` : ''}`}
                            value={l.hasPrice ? money(l.cost) : '—'} />
                        ))}
                      </div>
                    );
                  })}
                  <Row sub label="(bunun fire payı)" value={money(c.bom.wasteTotal)} />
                  <Row label={`Elektrik · ${number(n(s.machinePowerW))} W × ${number(c.hours)} sa`} value={money(c.electricity)} strong />
                  <Row label={`İşçilik · ${number(c.hours)} sa × ${money(s.hourlyRate)}`} value={money(c.labor)} strong />
                  <Row label="Ambalaj" value={money(c.packaging)} strong />
                  <div className="row-line total"><span>İlk yatırım hariç</span><span>{money(c.withPackaging)}</span></div>
                  <Row label="İlk yatırım payı" value={money(c.invPerUnit)} />
                  <div className="row-line total"><span>İlk yatırım dahil</span><span>{money(c.withInvestment)}</span></div>
                </Card>

                <div className="stack">
                  <Card title="Maliyet dağılımı">
                    {pie.length ? (
                      <div className="chart-box">
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                              {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                            </Pie>
                            <Tooltip formatter={(v) => money(v)} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <p className="muted small">Veri yok.</p>}
                  </Card>
                  <Card title="Yatırım adet senaryoları" subtitle="Yatırım kaç çantaya bölünürse">
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Toplam adet</th><th className="num">Yatırım payı</th><th className="num">Birim maliyet</th></tr></thead>
                        <tbody>
                          {[20, 50, 100, 250, 500, 1000].map((u) => (
                            <tr key={u}>
                              <td>{u} adet</td>
                              <td className="num">{money(inv.total / u)}</td>
                              <td className="num"><strong>{money(c.withPackaging + inv.total / u)}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
