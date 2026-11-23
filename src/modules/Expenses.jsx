import { Plus, Trash2, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useStore } from '../store.jsx';
import { EXPENSE_CATEGORIES } from '../lib/seed.js';
import { insuranceCalc, monthlyFixed, param } from '../lib/calc.js';
import { money, money0, uid, n, date, number } from '../lib/format.js';
import { PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Select, Stat, Notice, Toggle, Row, Tabs, Badge, confirmDelete } from '../ui.jsx';

const COLORS = ['#7b2d3b', '#d99aa5', '#b08d6e', '#3d2a2e', '#e7bfc0', '#a8706a', '#c9b6a6', '#5e1f2b'];

export function InsuranceCard() {
  const { state, update } = useStore();
  const ins = state.insurance;
  const c = insuranceCalc(state);
  const set = (k) => (v) => update((d) => { d.insurance[k] = v; });
  const p = (k) => state.params.find((x) => x.key === k);

  return (
    <Card title="Sosyal güvenlik senaryosu" subtitle="Sahibin sigortalılık durumu ve personel maliyeti">
      <Tabs value={ins.scenario} onChange={set('scenario')} tabs={[
        { value: '4b', label: '4/b Bağ-Kur (kendi adıma)' },
        { value: '4a', label: '4/a SGK’lı çalışıyorum' },
      ]} />
      {ins.scenario === '4b' ? (
        <>
          <div className="form-grid cols-2">
            <Field label="Prime esas beyan edilen kazanç" hint={`Alt sınır ${money(c.min)} · üst sınır ${money(c.max)}`}>
              <NumberInput value={ins.declaredBase} onChange={set('declaredBase')} suffix="₺" placeholder={String(c.min)} />
            </Field>
            <Field label="Düzenli ödeme indirimi">
              <Toggle checked={ins.discount} onChange={set('discount')} label={`${number(param(state, 'bagkurIndirim'))} puan indirim`} />
            </Field>
          </div>
          <div className="mt">
            <Row label="Esas kazanç" value={money(c.base)} />
            <Row label="Uygulanan oran" value={`%${number(c.rate)}`} />
            <div className="row-line total"><span>Aylık Bağ-Kur primi</span><span>{money(c.bagkur)}</span></div>
          </div>
        </>
      ) : (
        <Notice tone="info" title="4/a kapsamında çalışırken şirket sahibi olmak">
          Başka bir işverende hizmet akdiyle (4/a) çalışırken aynı zamanda vergi mükellefi olursanız, 5510 sayılı Kanun md. 53 uyarınca
          birden fazla statünün çakışmasında kural olarak 4/a sigortalılığı esas alınır ve aynı anda iki prim ödenmesi varsayılmamalıdır.
          Bu senaryoda sahip için Bağ-Kur primi aylık gidere <strong>eklenmez</strong>. Durumunuzun mevzuata göre değerlendirilmesi için SGK ve mali müşavirinize danışın;
          Bağ-Kur kaydı açılıp açılmayacağı ve 4/a sona erdiğinde 4/b’nin başlayacağı ayrıca kontrol edilmelidir.
        </Notice>
      )}
      <div className="section-title">Personel (opsiyonel)</div>
      <div className="form-grid cols-2">
        <Field label="Personel sayısı"><NumberInput value={ins.employees} onChange={set('employees')} suffix="kişi" /></Field>
        <Field label="Kişi başı brüt ücret" hint={`Asgari brüt: ${money(param(state, 'asgariBrut'))}`}><NumberInput value={ins.employeeGross} onChange={set('employeeGross')} suffix="₺" /></Field>
      </div>
      <Row label={`İşveren maliyeti (brüt + %${number(param(state, 'isverenSgkOran'))} işveren payı)`} value={money(c.employer)} />
      <div className="row-line total"><span>Aylık sosyal güvenlik + personel</span><span>{money(c.monthly)}</span></div>
      <p className="tiny muted mt">
        Parametreler: Asgari ücret {money(p('asgariBrut')?.value)} ({date(p('asgariBrut')?.validFrom)}), Bağ-Kur oranı %{number(p('bagkurOran')?.value)} — {p('bagkurOran')?.source}.
        Değerleri <a href="#/sirket">Şirket Kuruluş Merkezi › Mevzuat parametreleri</a> bölümünden güncelleyebilirsiniz. Bu hesap bilgilendirme amaçlıdır.
      </p>
    </Card>
  );
}

export default function Expenses() {
  const { state, update } = useStore();
  const fixed = monthlyFixed(state);
  const setE = (i, k, v) => update((d) => { d.expenses[i][k] = v; });

  const byCat = {};
  state.expenses.filter((e) => e.active).forEach((e) => {
    byCat[e.category] = (byCat[e.category] || 0) + (e.frequency === 'yillik' ? n(e.amount) / 12 : n(e.amount));
  });
  if (fixed.insurance) byCat['Sosyal güvenlik & personel'] = fixed.insurance;
  const pie = Object.entries(byCat).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0);

  return (
    <>
      <PageHeader
        eyebrow="Modül 8"
        title="Aylık İşletme Giderleri"
        subtitle="Yalnızca tekrarlanan (aylık / yıllık) giderler. Tek seferlik kuruluş giderleri Şirket Kuruluş Merkezi’nde, gerçekleşen ödemeler Harcamalar’da tutulur."
        actions={<Button icon={Plus} onClick={() => update((d) => { d.expenses.push({ id: uid(), name: 'Yeni gider', category: EXPENSE_CATEGORIES[0], amount: 0, frequency: 'aylik', active: true, note: '' }); })}>Gider ekle</Button>}
      />

      <div className="stats mb">
        <Stat tone="feature" label="Toplam aylık sabit gider" value={money0(fixed.total)} hint="Yıllık kalemler 12’ye bölünür" />
        <Stat label="İşletme giderleri" value={money0(fixed.recurring)} />
        <Stat label="Sosyal güvenlik + personel" value={money0(fixed.insurance)} icon={ShieldCheck} />
        <Stat tone="pink" label="Yıllık toplam" value={money0(fixed.yearly)} />
      </div>

      <div className="grid g-2-1">
        <Card title="Tekrarlanan giderler" pad={false}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Gider</th><th>Kategori</th><th>Sıklık</th><th className="num">Tutar</th><th className="num">Aylık karşılığı</th><th>Aktif</th><th /></tr></thead>
              <tbody>
                {state.expenses.map((e, i) => (
                  <tr key={e.id} style={{ opacity: e.active ? 1 : 0.5 }}>
                    <td className="cell-input" style={{ minWidth: 200 }}><TextInput value={e.name} onChange={(v) => setE(i, 'name', v)} /></td>
                    <td className="cell-input" style={{ minWidth: 150 }}><Select value={e.category} onChange={(v) => setE(i, 'category', v)} options={EXPENSE_CATEGORIES} /></td>
                    <td className="cell-input" style={{ minWidth: 100 }}><Select value={e.frequency} onChange={(v) => setE(i, 'frequency', v)} options={[{ value: 'aylik', label: 'Aylık' }, { value: 'yillik', label: 'Yıllık' }]} /></td>
                    <td className="cell-input num" style={{ minWidth: 130 }}><NumberInput value={e.amount} onChange={(v) => setE(i, 'amount', v)} suffix="₺" /></td>
                    <td className="num">{money(e.frequency === 'yillik' ? n(e.amount) / 12 : n(e.amount))}</td>
                    <td><Toggle checked={e.active} onChange={(v) => setE(i, 'active', v)} /></td>
                    <td><IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete(`“${e.name}”`) && update((d) => { d.expenses.splice(i, 1); })} /></td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4}><strong>Sosyal güvenlik & personel</strong> <Badge tone="info">Senaryodan otomatik</Badge></td>
                  <td className="num">{money(fixed.insurance)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
              <tfoot><tr><td colSpan={4}>Toplam aylık</td><td className="num">{money(fixed.total)}</td><td colSpan={2} /></tr></tfoot>
            </table>
          </div>
          <div className="card-body">
            <Notice tone="brand">Kargo, komisyon ve ödeme altyapısının <em>satış başına</em> değişken kısmını buraya değil, Fiyatlandırma modülüne girin; burada yalnızca sabit abonelik/anlaşma ücretleri yer almalı. Böylece aynı gider iki kez sayılmaz.</Notice>
          </div>
        </Card>
        <div className="stack">
          <InsuranceCard />
          <Card title="Gider dağılımı (aylık)">
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
            ) : <p className="muted small">Tutar girildiğinde grafik oluşur.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
