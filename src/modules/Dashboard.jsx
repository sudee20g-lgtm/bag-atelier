import { useMemo } from 'react';
import {
  Wallet, TrendingDown, PiggyBank, Calculator, Boxes, ShoppingCart, Package, Receipt, Sparkles, CalendarClock, Scale, BellRing,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { useStore } from '../store.jsx';
import { dashboard, stockByProduct, monthlyFixed } from '../lib/calc.js';
import { money, money0, number, date, monthKey, monthLabel, n } from '../lib/format.js';
import { PageHeader, Card, Stat, Badge, Empty, Notice, Row, Button } from '../ui.jsx';
import { go } from '../lib/nav.js';

const PIE = ['#7b2d3b', '#d99aa5', '#b08d6e', '#3d2a2e', '#e7bfc0', '#a8706a', '#c9b6a6'];
export const LEDGER_CATS = {
  malzeme: 'Malzeme', ekipman: 'Ekipman', kurulus: 'Kuruluş', isletme: 'İşletme gideri', fason: 'Fason üretim', pazarlama: 'Pazarlama', diger: 'Diğer',
};

export default function Dashboard() {
  const { state } = useStore();
  const d = useMemo(() => dashboard(state), [state]);
  const stock = useMemo(() => stockByProduct(state).filter((x) => x.produced || x.sold), [state]);
  const fixed = monthlyFixed(state);

  const monthly = useMemo(() => {
    const map = {};
    const add = (k, field, v) => {
      if (!k) return;
      map[k] ||= { key: k, ciro: 0, harcama: 0 };
      map[k][field] += v;
    };
    state.sales.forEach((s) => add(monthKey(s.date), 'ciro', n(s.qty) * n(s.unitPrice)));
    state.ledger.forEach((t) => add(monthKey(t.date), 'harcama', n(t.amount)));
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-8).map((x) => ({ ...x, ay: monthLabel(x.key) }));
  }, [state.sales, state.ledger]);

  const byCat = useMemo(() => {
    const m = {};
    state.ledger.forEach((t) => (m[t.category] = (m[t.category] || 0) + n(t.amount)));
    return Object.entries(m).map(([k, v]) => ({ name: LEDGER_CATS[k] || k, value: v })).filter((x) => x.value > 0);
  }, [state.ledger]);

  const firstRun = !state.settings.capital && !state.products.length && !state.ledger.length;

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        title={`${state.settings.brandName || 'Bag Atelier'} · Yönetim Paneli`}
        subtitle="Tüm göstergeler ürün, üretim, satış, gider ve harcama kayıtlarınızdan otomatik hesaplanır."
      />

      {firstRun && (
        <Notice tone="brand" title="Hoş geldiniz! Başlamak için üç adım:">
          1) <a href="#/ayarlar">Ayarlar</a>’dan başlangıç sermayenizi ve saatlik işçilik ücretinizi girin. 2){' '}
          <a href="#/malzemeler">Malzeme kataloğuna</a> doğrulanmış fiyatları kaynağıyla ekleyin. 3){' '}
          <a href="#/urunler">İlk çanta modelinizi</a> oluşturun.
        </Notice>
      )}

      <div className="stats mt">
        <Stat tone="feature" label="Başlangıç sermayesi" value={money0(d.capital)} icon={Wallet} hint="Ayarlar’dan düzenlenir" />
        <Stat label="Harcanan" value={money0(d.spent)} icon={TrendingDown} hint={`${state.ledger.length} harcama kaydı`} />
        <Stat tone={d.available < 0 ? 'neg' : 'pink'} label="Kullanılabilir bütçe" value={money0(d.available)} icon={PiggyBank} hint="Sermaye − harcanan (ciro hariç)" />
        <Stat label="Ürün başına ort. maliyet" value={d.avgCost === null ? '—' : money(d.avgCost)} icon={Calculator} hint="Üretim kayıtlarından, ağırlıklı" />
        <Stat label="Toplam üretim" value={`${number(d.produced)} adet`} icon={Boxes} />
        <Stat label="Satılan ürün" value={`${number(d.sold)} adet`} icon={ShoppingCart} />
        <Stat tone={d.stock < 0 ? 'neg' : ''} label="Stokta kalan" value={`${number(d.stock)} adet`} icon={Package} hint={d.stock < 0 ? 'Satış, üretimden fazla görünüyor' : ''} />
        <Stat label="Toplam ciro (KDV dahil)" value={money0(d.revenue)} icon={Receipt} hint={`KDV hariç: ${money0(d.revenueNet)} — ciro kâr değildir`} />
        <Stat tone={d.netProfit < 0 ? 'neg' : 'pos'} label="Tahmini net kâr" value={money0(d.netProfit)} icon={Sparkles} hint={`${d.months} aylık dönem, sabit giderler ve vergi payı düşülmüş`} />
        <Stat label="Aylık sabit giderler" value={money0(fixed.total)} icon={CalendarClock} hint="Tek seferlik kuruluş giderleri hariç" />
        <Stat
          label="Başabaş noktası"
          value={d.breakEvenUnits === null ? '—' : `${number(d.breakEvenUnits)} adet/ay`}
          icon={Scale}
          hint={d.avgContribution === null ? 'Fiyatlandırma modülünde satış fiyatı belirleyin' : `Ort. katkı payı ${money(d.avgContribution)}/adet`}
        />
        <Stat tone={d.upcoming.some((p) => p.days < 0) ? 'neg' : ''} label="Yaklaşan ödemeler (30 gün)" value={money0(d.upcomingTotal30)} icon={BellRing} hint={`${d.upcoming.length} bekleyen ödeme`} />
      </div>

      <div className="grid g-2-1 mt">
        <Card title="Aylık ciro ve harcamalar" subtitle="Son 8 ay · ciro KDV dahil">
          {monthly.length ? (
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={monthly} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eadfd4" vertical={false} />
                  <XAxis dataKey="ay" tick={{ fontSize: 12, fill: '#6b5a5f' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => money0(v)} tick={{ fontSize: 11, fill: '#9a8a8d' }} axisLine={false} tickLine={false} width={84} />
                  <Tooltip formatter={(v) => money(v)} cursor={{ fill: 'rgba(242,217,215,0.3)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="ciro" name="Ciro" fill="#7b2d3b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="harcama" name="Harcama" fill="#e7bfc0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="Henüz veri yok" text="Satış ve harcama kaydettiğinizde aylık grafik burada oluşur." />
          )}
        </Card>
        <Card title="Harcama dağılımı" subtitle="Kategoriye göre">
          {byCat.length ? (
            <div className="chart-box">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {byCat.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty title="Harcama yok" text="Harcama & Ödemeler bölümünden kayıt ekleyin." />
          )}
        </Card>
      </div>

      <div className="grid g3 mt">
        <Card title="Kâr özeti (tahmini)" subtitle={`Başlangıçtan bugüne · ${d.months} ay`}>
          <Row label="Ciro (KDV dahil)" value={money(d.revenue)} />
          <Row label="KDV hariç net satış" value={money(d.revenueNet)} strong />
          <Row sub label="− Satılan malın maliyeti" value={money(d.cogs)} />
          <Row sub label="− Satış giderleri (komisyon, kargo)" value={money(d.saleCosts)} />
          <Row label="Brüt kâr" value={money(d.grossProfit)} strong />
          <Row sub label={`− Sabit giderler (${d.months} ay)`} value={money(d.fixedForPeriod)} />
          <Row sub label="− Vergi payı (tahmini)" value={money(d.taxRes)} />
          <div className={`row-line total ${d.netProfit < 0 ? 'neg' : ''}`}>
            <span>Tahmini net kâr</span>
            <span>{money(d.netProfit)}</span>
          </div>
          <p className="tiny muted mt">Bu bir yönetim tahminidir; resmî kâr/zarar ve vergi hesabı için mali müşavirinize danışın.</p>
        </Card>

        <Card title="Stok durumu" subtitle="Ürün bazında" actions={<Button variant="ghost" size="sm" onClick={() => go('kayitlar')}>Kayıtlar</Button>}>
          {stock.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ürün</th><th className="num">Üretim</th><th className="num">Satış</th><th className="num">Stok</th></tr></thead>
                <tbody>
                  {stock.map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td className="num">{s.produced}</td>
                      <td className="num">{s.sold}</td>
                      <td className="num"><Badge tone={s.stock <= 0 ? 'danger' : s.stock < 5 ? 'warn' : 'ok'}>{s.stock}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Stok yok" text="Üretim kaydı girdiğinizde stok burada görünür." />
          )}
        </Card>

        <Card title="Yaklaşan ödemeler" actions={<Button variant="ghost" size="sm" onClick={() => go('harcamalar')}>Tümü</Button>}>
          {d.upcoming.length ? (
            d.upcoming.slice(0, 6).map((p) => {
              const dt = new Date(p.dueDate + 'T00:00:00');
              return (
                <div className="pay-item" key={p.id}>
                  <div className={`pay-date ${p.days < 0 ? 'late' : ''}`}>
                    <b>{dt.getDate()}</b>
                    <small>{dt.toLocaleDateString('tr-TR', { month: 'short' })}</small>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{p.title}</div>
                    <div className="tiny muted">
                      {p.days < 0 ? `${-p.days} gün gecikti` : p.days === 0 ? 'Bugün' : `${p.days} gün sonra`} · {date(p.dueDate)}
                    </div>
                  </div>
                  <strong className="mono">{money(p.amount)}</strong>
                </div>
              );
            })
          ) : (
            <Empty title="Bekleyen ödeme yok" text="Kira, prim, tedarikçi ödemelerini takvime ekleyin." />
          )}
        </Card>
      </div>
    </>
  );
}
