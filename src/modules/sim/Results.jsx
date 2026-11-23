import { useMemo } from 'react';
import { AlertTriangle, Download, Printer, Wand2, Pencil, RefreshCw, Send } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { computeSim, deriveScenario, SCENARIOS, SRC, KIND, FREQ } from '../../lib/simulator.js';
import { money, money0, number, pct, n, today } from '../../lib/format.js';
import { Card, Badge, Button, Notice, Row } from '../../ui.jsx';
import { useSim, KindBadge, SrcBadge } from './common.jsx';
import { exportExcel } from './exportExcel.js';

const COLORS = ['#7b2d3b', '#d99aa5', '#b08d6e', '#3d2a2e', '#e7bfc0', '#a8706a', '#c9b6a6'];

function Breakdown({ groups, valueKey = 'amount', monthly }) {
  return groups.map((g) => (
    <div key={g.key} className="bd-group">
      <div className="row-line strong"><span>{g.label}</span><span>{money(g.total)}</span></div>
      {g.lines.length === 0 && <div className="tiny muted" style={{ padding: '4px 0 8px 14px' }}>Bu grupta kalem yok.</div>}
      {g.lines.map((l) => (
        <div key={l.key} className="bd-line">
          <div className="bd-label">
            <span>{l.label}</span>
            <span className="bd-badges">
              <KindBadge kind={l.kind} />
              <SrcBadge src={l.src} />
              {monthly && l.freq === 'yearly' && <Badge>Yıllık {money0(l.amount)} ÷ 12</Badge>}
            </span>
            {l.note && <span className="tiny muted">{l.note}</span>}
          </div>
          <span className="mono">{money(l[valueKey])}</span>
        </div>
      ))}
    </div>
  ));
}

export function ResultView() {
  const { result: r, cfg, update, sim } = useSim();
  const u = r.unit;
  const f = r.fin;
  const pie = r.startupGroups.filter((g) => g.total > 0).map((g) => ({ name: g.label, value: g.total }));
  const bars = r.monthlyGroups.filter((g) => g.total > 0).map((g) => ({ name: g.label.split(' ')[0], tutar: Math.round(g.total) }));

  return (
    <div className="print-area">
      <div className="print-only">
        <h1>İş Kurma ve Maliyet Simülasyonu</h1>
        <p>{sim.name} · {SCENARIOS.find((s) => s.id === sim.active)?.label} · {today().split('-').reverse().join('.')}</p>
      </div>

      {r.warnings.length > 0 && (
        <Notice tone="warn" title="Dikkat edilmesi gerekenler">
          <ul style={{ margin: 0, paddingLeft: 18 }}>{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Notice>
      )}
      {r.missingAmounts > 0 && (
        <Notice tone="danger" title={`${r.missingAmounts} kalemin tutarı girilmedi`}>
          Bu kalemler 0 ₺ olarak hesaplandı ve dökümde “Tutar girilmedi” etiketiyle gösterildi. Gerçek ihtiyacınız daha yüksek olabilir.
        </Notice>
      )}

      {/* D — Finansal sonuç özeti */}
      <div className="result-hero mt">
        <div className="hero-main">
          <div className="hero-label">İlk satışa kadar ihtiyaç duyulan toplam sermaye</div>
          <div className="hero-value">{money0(f.capitalNeed)}</div>
          <div className="hero-sub">Başlangıç yatırımı {money0(r.startupTotal)} + {n(cfg.target.monthsToFirstSale)} ay ilk satışa kadar ve {n(cfg.target.reserveMonths)} ay rezerv sabit gider ({money0(f.runway)})</div>
        </div>
        <div className="hero-grid">
          <div><span>Aylık toplam gider</span><b>{money0(f.monthlyTotal)}</b><small>Sabit {money0(f.monthlyFixed)} + değişken {money0(f.monthlyVariable)}</small></div>
          <div><span>Ürün başına toplam maliyet</span><b>{money(f.unitTotal)}</b><small>Değişken + sabit gider payı</small></div>
          <div><span>Önerilen satış fiyatı</span><b>{f.suggestedPrice ? money0(f.suggestedPrice) : '—'}</b><small>%{number(cfg.target.targetMargin)} net marj, KDV dahil</small></div>
          <div><span>Ürün başına tahmini kâr</span><b className={f.profitUnit < 0 ? 'neg-text' : ''}>{money(f.profitUnit)}</b><small>{money0(cfg.target.avgPrice)} fiyatla, vergi sonrası</small></div>
          <div><span>Aylık başabaş satış</span><b>{f.breakEvenUnits ? `${f.breakEvenUnits} adet` : '—'}</b><small>Hedef: {n(cfg.target.monthlySales)} adet</small></div>
          <div><span>Yatırımın geri dönüşü</span><b>{f.payback ? `${number(Math.ceil(f.payback * 10) / 10)} ay` : 'Dönmüyor'}</b><small>{f.payback ? 'Başlangıç yatırımı ÷ aylık net kâr' : 'Aylık net kâr negatif'}</small></div>
        </div>
      </div>

      <div className="grid g2 mt">
        <Card title="A) Başlangıç yatırımı" subtitle="Tek seferlik nakit ihtiyacı">
          <Breakdown groups={r.startupGroups} />
          <div className="row-line total"><span>Toplam başlangıç yatırımı</span><span>{money(r.startupTotal)}</span></div>
        </Card>
        <div className="stack">
          <Card title="Başlangıç yatırımı dağılımı">
            {pie.length ? (
              <div className="chart-box">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                      {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="muted small">Tutar girildikçe oluşur.</p>}
          </Card>
          <Card title="B) Aylık sabit giderler" subtitle="Yıllık kalemler 12’ye bölünür; tek seferlik giderler dahil değildir">
            <Breakdown groups={r.monthlyGroups} valueKey="monthly" monthly />
            <div className="row-line total"><span>Aylık sabit gider</span><span>{money(r.monthlyFixed)}</span></div>
          </Card>
        </div>
      </div>

      <div className="grid g2 mt">
        <Card title="C) Bir çantanın maliyeti" subtitle={`${money0(cfg.target.avgPrice)} ortalama satış fiyatı ile`}>
          <Row label="Satış fiyatı (KDV dahil)" value={money(cfg.target.avgPrice)} strong />
          <Row sub label={`− KDV (%${number(cfg.target.kdv)}) — devlete ödenir, gelir değildir`} value={money(u.kdvAmount)} />
          <Row label="Net satış (KDV hariç)" value={money(u.netSales)} strong />
          <Row sub label="Malzeme maliyeti (fire dahil)" value={money(u.material)} />
          {u.labor > 0 && <Row sub label="İşçilik" value={money(u.labor)} />}
          {u.sewing > 0 && <Row sub label="Fason dikim, KK, paketleme hizmeti, nakliye payı" value={money(u.sewing)} />}
          <Row sub label="Ambalaj" value={money(u.packaging)} />
          <Row sub label="Kargo" value={money(u.shipping)} />
          <Row sub label={`Komisyon (ağırlıklı %${number(u.commPct * 100)})`} value={money(u.commission)} />
          <Row sub label={`İade ve fire payı (%${number(cfg.target.returnPct)})`} value={money(u.returns)} />
          {u.otherVar > 0 && <Row sub label="Diğer değişken giderler" value={money(u.otherVar)} />}
          <Row label="Değişken maliyet toplamı" value={money(u.variable)} strong />
          <Row label="Birim katkı payı" value={money(u.contribution)} strong tone={u.contribution < 0 ? 'neg' : 'pos'} />
          <Row sub label={`− Sabit gider payı (${money0(r.monthlyFixed)} ÷ ${n(cfg.target.monthlySales)} adet)`} value={money(u.fixedPerUnit)} />
          <Row label="Vergi öncesi kâr" value={money(u.preTaxUnit)} strong />
          <Row sub label={`− Vergi için ayrılacak (%${number(f.taxRate)}${r.ye.eligible ? ', genç girişimci istisnası düşülerek' : ''})`} value={money(u.taxUnit)} />
          <div className={`row-line total ${u.profitUnit < 0 ? 'neg' : ''}`}><span>Ürün başına tahmini net kâr</span><span>{money(u.profitUnit)}</span></div>
          <div className="row-line"><span className="muted">Bilgi: ürün başına makine payı (maliyete eklenmedi)</span><span className="muted">{money(u.machineShare)}</span></div>
        </Card>

        <div className="stack">
          <Card title="D) Aylık finansal tablo" subtitle={`${n(cfg.target.monthlySales)} adet/ay hedefiyle`}>
            <Row label="Aylık ciro (KDV dahil) — kâr değildir" value={money(f.monthlyRevenue)} />
            <Row label="Net satış (KDV hariç)" value={money(f.monthlyNetSales)} strong />
            <Row sub label="− Değişken giderler" value={money(f.monthlyVariable)} />
            <Row sub label="− Sabit giderler" value={money(f.monthlyFixed)} />
            <Row label="Vergi öncesi kâr" value={money(f.monthlyPreTax)} strong tone={f.monthlyPreTax < 0 ? 'neg' : ''} />
            {f.exemptMonthly > 0 && <Row sub label="Genç girişimci istisnası (aylık karşılığı)" value={money(f.exemptMonthly)} />}
            <Row sub label="− Vergi için ayrılacak" value={money(f.monthlyTax)} />
            <div className={`row-line total ${f.monthlyNet < 0 ? 'neg' : ''}`}><span>Aylık tahmini net kâr</span><span>{money(f.monthlyNet)}</span></div>
            <div className="mt">
              <Row label="Başabaş satış fiyatı (KDV dahil)" value={f.breakEvenPrice ? money(f.breakEvenPrice) : '—'} />
              <Row label="SGK / Bağ-Kur (aylık, ayrı kalem)" value={money(r.bagkur.amount)} />
            </div>
          </Card>
          <Card title="Aylık sabit gider dağılımı">
            {bars.length ? (
              <div className="chart-box">
                <ResponsiveContainer>
                  <BarChart data={bars} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eadfd4" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => money0(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Bar dataKey="tutar" fill="#7b2d3b" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="muted small">Tutar girildikçe oluşur.</p>}
          </Card>
        </div>
      </div>

      {(r.purchases.length > 0 || r.packPurchases.length > 0) && (
        <Card title="İlk malzeme alım listesi" subtitle="İhtiyaç − stok; eksik varsa en az MOQ kadar" className="mt" pad={false}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Malzeme</th><th className="num">İhtiyaç</th><th className="num">Stok</th><th className="num">Alınacak</th><th className="num">Birim fiyat</th><th className="num">Tutar</th><th>Kaynak</th></tr></thead>
              <tbody>
                {[...r.purchases, ...r.packPurchases].map((x) => (
                  <tr key={x.id}>
                    <td><strong>{x.material?.name}</strong>{x.material?.supplier && <div className="tiny muted">{x.material.supplier}</div>}</td>
                    <td className="num">{number(x.need)} {x.material?.unit}</td>
                    <td className="num">{number(x.stock)}</td>
                    <td className="num">{number(x.buy)}{n(x.material?.moq) > 0 && x.buy === n(x.material.moq) && <div><Badge tone="info">MOQ</Badge></div>}</td>
                    <td className="num">{x.hasPrice ? money(x.material.price) : '—'}</td>
                    <td className="num"><strong>{x.hasPrice ? money(x.cost) : '—'}</strong></td>
                    <td><SrcBadge src={x.hasPrice ? 'katalog' : 'eksik'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Kaynak etiketleri" className="mt">
        <div className="hstack">
          {Object.entries(SRC).map(([k, v]) => <Badge key={k} tone={v.tone}>{v.label}</Badge>)}
          {Object.entries(KIND).map(([k, v]) => <Badge key={k} tone={v.tone}>{v.label}</Badge>)}
        </div>
        <p className="tiny muted mt">
          “Resmî parametre” etiketli tutarlar Şirket Kuruluş Merkezi’ndeki mevzuat parametrelerinden hesaplanır ve kaynak/tarih bilgisiyle saklanır; doğrulanmamış parametreler orada işaretlidir.
          Bu simülasyon karar desteği içindir; vergi ve SGK hesapları kesin mali veya hukuki danışmanlık değildir.
        </p>
      </Card>
    </div>
  );
}

export function ScenarioCompare({ onEdit }) {
  const { state, sim, update } = useSim();
  const rows = useMemo(
    () => SCENARIOS.map((s) => ({ ...s, cfg: sim.scenarios[s.id], r: sim.scenarios[s.id] ? computeSim(state, sim.scenarios[s.id]) : null })),
    [state, sim]
  );
  const create = (id) =>
    update((d) => {
      d.sim.scenarios[id] = deriveScenario(d.sim.scenarios.dengeli, id);
    });
  const metrics = [
    ['Toplam sermaye ihtiyacı', (r) => money0(r.fin.capitalNeed), (r) => r.fin.capitalNeed],
    ['Başlangıç yatırımı', (r) => money0(r.startupTotal), (r) => r.startupTotal],
    ['Aylık sabit gider', (r) => money0(r.monthlyFixed), (r) => r.monthlyFixed],
    ['Aylık toplam gider', (r) => money0(r.fin.monthlyTotal), (r) => r.fin.monthlyTotal],
    ['İlk üretim adedi', (r) => `${r.totalUnits} adet`],
    ['Ürün başına toplam maliyet', (r) => money(r.fin.unitTotal)],
    ['Ürün başına net kâr', (r) => money(r.fin.profitUnit)],
    ['Aylık başabaş adedi', (r) => (r.fin.breakEvenUnits ? `${r.fin.breakEvenUnits} adet` : '—')],
    ['Geri dönüş süresi', (r) => (r.fin.payback ? `${number(Math.ceil(r.fin.payback * 10) / 10)} ay` : 'Dönmüyor')],
    ['Tutarı girilmemiş kalem', (r) => r.missingAmounts],
  ];
  const chart = rows.filter((x) => x.r).map((x) => ({ name: x.label.split(' ')[0], 'Sermaye ihtiyacı': Math.round(x.r.fin.capitalNeed), 'Aylık gider': Math.round(x.r.fin.monthlyTotal) }));

  return (
    <>
      <Notice tone="info" title="Senaryolar nasıl oluşur?">
        Dengeli senaryo sizin seçimlerinizdir. Ekonomik ve profesyonel senaryolar bu seçimlerden türetilir (evden üretim / kiralık atölye, temel / tüm ekipman, küçük / büyük stok ve reklam).
        Yeni eklenen kalemlerin tutarı otomatik uydurulmaz — “Düzenle” ile senaryoyu açıp tutarları girin.
      </Notice>
      <Card className="mt" pad={false}>
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th />
                {rows.map((x) => (
                  <th key={x.id} className="num" style={{ minWidth: 170 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>{x.label}</div>
                    <div className="tiny muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, whiteSpace: 'normal' }}>{x.desc}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map(([label, fmt, raw]) => {
                const vals = rows.map((x) => (x.r && raw ? raw(x.r) : null)).filter((v) => v !== null);
                const min = vals.length > 1 ? Math.min(...vals) : null;
                return (
                  <tr key={label}>
                    <td style={{ fontWeight: 700 }}>{label}</td>
                    {rows.map((x) => (
                      <td key={x.id} className={`num ${x.r && raw && min !== null && raw(x.r) === min ? 'best-cell' : ''}`}>{x.r ? fmt(x.r) : '—'}</td>
                    ))}
                  </tr>
                );
              })}
              <tr className="no-print">
                <td />
                {rows.map((x) => (
                  <td key={x.id} className="num">
                    <div className="hstack" style={{ justifyContent: 'flex-end' }}>
                      {x.cfg ? (
                        <>
                          <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(x.id)}>Düzenle</Button>
                          {x.id !== 'dengeli' && <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => window.confirm('Senaryo dengeli senaryodan yeniden oluşturulacak; bu senaryodaki değişiklikler kaybolur.') && create(x.id)}>Yenile</Button>}
                        </>
                      ) : (
                        <Button size="sm" icon={Wand2} onClick={() => create(x.id)}>Oluştur</Button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
      {chart.length > 1 && (
        <Card title="Senaryo karşılaştırması" className="mt">
          <div className="chart-box">
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eadfd4" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => money0(v)} width={84} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Sermaye ihtiyacı" fill="#7b2d3b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Aylık gider" fill="#e7bfc0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </>
  );
}

export function ExportBar() {
  const { state, sim, result, update } = useSim();
  return (
    <div className="hstack no-print">
      <Button variant="secondary" icon={Download} onClick={() => exportExcel(state, sim)}>Excel</Button>
      <Button variant="secondary" icon={Printer} onClick={() => window.print()}>PDF</Button>
      <Button variant="ghost" icon={Send} onClick={() => {
        if (window.confirm(`Panel’deki başlangıç sermayesi ${money0(result.fin.capitalNeed)} olarak güncellensin mi?`)) update((d) => { d.settings.capital = Math.round(result.fin.capitalNeed); });
      }}>Sermayeyi panele aktar</Button>
    </div>
  );
}

export { AlertTriangle, FREQ, pct };
