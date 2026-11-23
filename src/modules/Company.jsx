import { useState } from 'react';
import { Plus, Trash2, ExternalLink, Landmark, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store.jsx';
import { COMPANY_TYPES, COMPANY_FACTS, INCENTIVES } from '../lib/seed.js';
import { money, money0, date, today, uid, n, number } from '../lib/format.js';
import { PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Select, Tabs, Badge, Notice, Modal, confirmDelete } from '../ui.jsx';

const STATUS = [
  { value: 'dogrulandi', label: 'Resmî kaynaktan doğrulandı', tone: 'ok' },
  { value: 'dogrulanmali', label: 'Doğrulanmalı', tone: 'warn' },
];

const OFFICIAL = [
  { name: 'Gelir İdaresi Başkanlığı', url: 'https://www.gib.gov.tr' },
  { name: 'SGK', url: 'https://www.sgk.gov.tr' },
  { name: 'Ticaret Bakanlığı', url: 'https://ticaret.gov.tr' },
  { name: 'MERSİS', url: 'https://mersis.ticaret.gov.tr' },
  { name: 'TÜRMOB', url: 'https://www.turmob.org.tr' },
  { name: 'Mevzuat Bilgi Sistemi', url: 'https://www.mevzuat.gov.tr' },
  { name: 'TÜRKPATENT', url: 'https://www.turkpatent.gov.tr' },
  { name: 'KOSGEB', url: 'https://www.kosgeb.gov.tr' },
  { name: 'Ticaret Sicil Gazetesi', url: 'https://www.ticaretsicil.gov.tr' },
];

function CostColumn({ type }) {
  const { state, update } = useStore();
  const setup = state.company.setup[type.id];
  const running = state.company.running[type.id];
  const setupTotal = setup.reduce((a, x) => a + n(x.amount), 0);
  const monthly = running.filter((x) => x.period === 'aylik').reduce((a, x) => a + n(x.amount), 0);
  const yearly = running.filter((x) => x.period === 'yillik').reduce((a, x) => a + n(x.amount), 0);
  const selected = state.company.selectedType === type.id;
  const facts = COMPANY_FACTS[type.id];
  const upd = (group, i, k, v) => update((d) => { d.company[group][type.id][i][k] = v; });

  const renderItem = (x, i, group) => (
    <div key={x.id} style={{ padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
      <div className="hstack" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="small" style={{ fontWeight: 700 }}>{x.label}</div>
          {x.note && <div className="tiny muted">{x.note}</div>}
        </div>
        <div className="cell-input" style={{ width: 118, flexShrink: 0 }}>
          <NumberInput value={x.amount} onChange={(v) => upd(group, i, 'amount', v)} suffix="₺" />
        </div>
      </div>
      <div className="hstack" style={{ marginTop: 4, gap: 6 }}>
        <label className="tiny hstack" style={{ gap: 4, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!x.verified} onChange={(e) => upd(group, i, 'verified', e.target.checked)} />
          Teklif/fatura ile doğrulandı
        </label>
        {group === 'running' && <Badge tone={x.period === 'aylik' ? 'brand' : 'info'}>{x.period === 'aylik' ? 'Aylık' : 'Yıllık'}</Badge>}
        {n(x.amount) > 0 && !x.verified && <Badge tone="warn">Tahmini</Badge>}
      </div>
    </div>
  );

  return (
    <Card
      className={selected ? '' : ''}
      title={type.label}
      subtitle={facts.capital}
      actions={selected ? <Badge tone="ok"><CheckCircle2 size={12} />Seçili</Badge> : <Button size="sm" variant="secondary" onClick={() => update((d) => { d.company.selectedType = type.id; })}>Seç</Button>}
    >
      <div style={{ borderRadius: 14, background: 'var(--cream)', padding: 12, marginBottom: 12 }}>
        <div className="tiny"><strong>Vergi:</strong> {facts.tax}</div>
        <div className="tiny" style={{ marginTop: 4 }}><strong>Sorumluluk:</strong> {facts.liability}</div>
      </div>
      <div className="section-title">Tek seferlik kuruluş giderleri</div>
      {setup.map((x, i) => renderItem(x, i, 'setup'))}
      <div className="row-line total"><span>Kuruluş toplamı</span><span>{money(setupTotal)}</span></div>

      <div className="section-title">Kuruluş sonrası tekrarlanan giderler</div>
      {running.map((x, i) => renderItem(x, i, 'running'))}
      <div className="row-line strong"><span>Aylık</span><span>{money(monthly)}</span></div>
      <div className="row-line strong"><span>Yıllık kalemler</span><span>{money(yearly)}</span></div>
      <div className="row-line total"><span>Yıllık toplam işletme</span><span>{money(monthly * 12 + yearly)}</span></div>

      <div className="section-title">Artılar / eksiler</div>
      <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
        {facts.pros.map((p) => <li key={p} style={{ color: 'var(--ok)' }}><span style={{ color: 'var(--ink)' }}>{p}</span></li>)}
        {facts.cons.map((p) => <li key={p} style={{ color: 'var(--danger)' }}><span style={{ color: 'var(--ink)' }}>{p}</span></li>)}
      </ul>
    </Card>
  );
}

function UpdateModal({ onClose }) {
  const { update } = useStore();
  const [u, setU] = useState({ id: uid(), date: today(), title: '', detail: '', source: '', url: '', status: 'dogrulanmali' });
  const set = (k) => (v) => setU((x) => ({ ...x, [k]: v }));
  return (
    <Modal open title="Mevzuat değişikliği ekle" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={() => { if (!u.title || !u.source) return alert('Başlık ve kaynak zorunludur.'); update((d) => { d.regUpdates.push(u); }); onClose(); }}>Kaydet</Button></>}>
      <div className="form-grid cols-2">
        <Field label="Yürürlük tarihi"><input type="date" value={u.date} onChange={(e) => set('date')(e.target.value)} /></Field>
        <Field label="Durum"><Select value={u.status} onChange={set('status')} options={STATUS} /></Field>
        <Field label="Başlık" wide><TextInput value={u.title} onChange={set('title')} /></Field>
        <Field label="Açıklama" wide><textarea value={u.detail} onChange={(e) => set('detail')(e.target.value)} /></Field>
        <Field label="Kaynak *"><TextInput value={u.source} onChange={set('source')} placeholder="ör. Resmî Gazete 12.03.2026" /></Field>
        <Field label="Bağlantı"><input type="url" value={u.url} onChange={(e) => set('url')(e.target.value)} placeholder="https://" /></Field>
      </div>
    </Modal>
  );
}

export default function Company() {
  const { state, update } = useStore();
  const [tab, setTab] = useState('karsilastir');
  const [addUpd, setAddUpd] = useState(false);
  const c = state.company;
  const totals = COMPANY_TYPES.map((t) => ({
    ...t,
    setup: c.setup[t.id].reduce((a, x) => a + n(x.amount), 0),
    yearly: c.running[t.id].reduce((a, x) => a + (x.period === 'aylik' ? n(x.amount) * 12 : n(x.amount)), 0),
  }));
  const updates = [...state.regUpdates].sort((a, b) => b.date.localeCompare(a.date));
  const done = c.checklist.filter((x) => x.done).length;

  return (
    <>
      <PageHeader
        eyebrow="Modül 7"
        title="Şirket Kuruluş Merkezi"
        subtitle="Şirket türlerini, kuruluş ve işletme maliyetlerini, teşvikleri ve mevzuat parametrelerini tek yerde yönetin."
      />
      <Notice tone="warn" title="Bilgilendirme amaçlıdır">
        Bu bölümdeki vergi, prim ve teşvik bilgileri kesin hukuki veya mali danışmanlık değildir. Tutarlar yıllık olarak değişir; karar vermeden önce
        resmî kaynaklardan ve mali müşavirinizden doğrulayın. Kuruluş masraflarına ait tutarlar siz teklif aldıkça doldurulmak üzere boş bırakılmıştır.
      </Notice>

      <div className="mt">
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'karsilastir', label: 'Şirket türleri' },
          { value: 'tesvik', label: 'Teşvikler' },
          { value: 'parametre', label: 'Mevzuat parametreleri' },
          { value: 'degisiklik', label: 'Mevzuat değişiklikleri', count: updates.length },
          { value: 'liste', label: `Kontrol listesi ${done}/${c.checklist.length}` },
        ]} />
      </div>

      {tab === 'karsilastir' && (
        <>
          <Card title="Özet karşılaştırma" pad={false}>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Şirket türü</th><th className="num">Tek seferlik kuruluş</th><th className="num">Yıllık işletme</th><th className="num">İlk yıl toplam</th></tr></thead>
                <tbody>
                  {totals.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.label}</strong> {c.selectedType === t.id && <Badge tone="ok">Seçili</Badge>}</td>
                      <td className="num">{money0(t.setup)}</td>
                      <td className="num">{money0(t.yearly)}</td>
                      <td className="num"><strong>{money0(t.setup + t.yearly)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-body tiny muted">Tek seferlik giderler ve tekrarlanan giderler ayrı tutulur; Aylık Giderler modülündeki toplamlara kuruluş masrafları eklenmez.</div>
          </Card>
          <div className="grid g3 mt">
            {COMPANY_TYPES.map((t) => <CostColumn key={t.id} type={t} />)}
          </div>
        </>
      )}

      {tab === 'tesvik' && (
        <div className="grid g2">
          {INCENTIVES.map((inc) => {
            const p = inc.paramKey && state.params.find((x) => x.key === inc.paramKey);
            return (
              <Card key={inc.title} title={inc.title}>
                <p className="small">{inc.summary}</p>
                {p && (
                  <div className="kpi-box mt">
                    <div className="k-label">{p.label}</div>
                    <div className="k-value">{money0(p.value)}</div>
                    <div className="tiny muted">{date(p.validFrom)} itibarıyla · {p.source}</div>
                    {p.status !== 'dogrulandi' && <Badge tone="warn">Doğrulanmalı</Badge>}
                  </div>
                )}
                <div className="section-title">Şartlar</div>
                <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
                  {inc.conditions.map((x) => <li key={x} style={{ marginBottom: 4 }}>{x}</li>)}
                </ul>
                <p className="tiny muted mt">Kaynak: <a href={inc.url} target="_blank" rel="noreferrer">{inc.source}</a></p>
              </Card>
            );
          })}
          <Card title="Resmî kaynaklar">
            <div className="link-list">
              {OFFICIAL.map((o) => <a key={o.url} className="link-pill" href={o.url} target="_blank" rel="noreferrer"><ExternalLink size={12} />{o.name}</a>)}
            </div>
          </Card>
        </div>
      )}

      {tab === 'parametre' && (
        <Card title="Hesaplamalarda kullanılan resmî parametreler" subtitle="Değer, yürürlük tarihi ve kaynak birlikte saklanır. Doğruladığınız değerleri “doğrulandı” olarak işaretleyin." pad={false}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Parametre</th><th className="num">Değer</th><th>Yürürlük</th><th>Kaynak</th><th>Durum</th></tr></thead>
              <tbody>
                {state.params.map((p, i) => (
                  <tr key={p.key}>
                    <td style={{ minWidth: 220 }}><strong>{p.label}</strong>{p.note && <div className="tiny muted">{p.note}</div>}</td>
                    <td className="cell-input" style={{ width: 150 }}>
                      <NumberInput value={p.value} suffix={p.unit} onChange={(v) => update((d) => { d.params[i].value = v; d.params[i].status = 'dogrulanmali'; })} />
                    </td>
                    <td className="cell-input" style={{ width: 150 }}>
                      <input type="date" value={p.validFrom} onChange={(e) => update((d) => { d.params[i].validFrom = e.target.value; })} />
                    </td>
                    <td className="cell-input" style={{ minWidth: 240 }}>
                      <TextInput value={p.source} onChange={(v) => update((d) => { d.params[i].source = v; })} />
                      {p.url && <a className="tiny" href={p.url} target="_blank" rel="noreferrer">{p.url.replace('https://', '')}</a>}
                    </td>
                    <td className="cell-input" style={{ minWidth: 170 }}>
                      <Select value={p.status} onChange={(v) => update((d) => { d.params[i].status = v; })} options={STATUS} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-body">
            <Notice>
              Varsayılan değerler {date('2026-11-23')} tarihinde basın ve meslek kaynaklarından derlenmiştir ve “Doğrulanmalı” olarak işaretlidir.
              Bağ-Kur oranı için kaynaklar arasında %34,5 – %35,75 aralığında farklılık bulunmaktadır.
            </Notice>
          </div>
        </Card>
      )}

      {tab === 'degisiklik' && (
        <Card title="Mevzuat değişiklikleri zaman çizelgesi" actions={<Button size="sm" icon={Plus} onClick={() => setAddUpd(true)}>Değişiklik ekle</Button>}>
          <div className="timeline">
            {updates.map((u) => (
              <div className="tl-item" key={u.id}>
                <div className="hstack" style={{ justifyContent: 'space-between' }}>
                  <span className="tl-date">{date(u.date)}</span>
                  <div className="hstack" style={{ gap: 4 }}>
                    <Badge tone={u.status === 'dogrulandi' ? 'ok' : 'warn'}>{u.status === 'dogrulandi' ? 'Doğrulandı' : <><AlertTriangle size={11} />Doğrulanmalı</>}</Badge>
                    <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete('Kayıt') && update((d) => { d.regUpdates = d.regUpdates.filter((x) => x.id !== u.id); })} />
                  </div>
                </div>
                <div style={{ fontWeight: 800 }}>{u.title}</div>
                <div className="small muted">{u.detail}</div>
                <div className="tiny" style={{ marginTop: 2 }}>Kaynak: {u.url ? <a href={u.url} target="_blank" rel="noreferrer">{u.source}</a> : u.source}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'liste' && (
        <Card title="Kuruluş kontrol listesi" subtitle={`${done} / ${c.checklist.length} tamamlandı`}>
          {c.checklist.map((x, i) => (
            <label key={x.id} className={`check-item ${x.done ? 'done' : ''}`}>
              <input type="checkbox" checked={x.done} onChange={(e) => update((d) => { d.company.checklist[i].done = e.target.checked; })} />
              <span style={{ flex: 1 }}>{x.text}</span>
              <IconButton icon={Trash2} tone="danger" label="Sil" onClick={(e) => { e.preventDefault(); update((d) => { d.company.checklist.splice(i, 1); }); }} />
            </label>
          ))}
          <AddCheck />
        </Card>
      )}
      {addUpd && <UpdateModal onClose={() => setAddUpd(false)} />}
    </>
  );
}

function AddCheck() {
  const { update } = useStore();
  const [t, setT] = useState('');
  return (
    <div className="hstack mt">
      <div style={{ flex: 1 }}><TextInput value={t} onChange={setT} placeholder="Yeni adım" /></div>
      <Button size="sm" variant="secondary" icon={Plus} onClick={() => { if (t.trim()) { update((d) => { d.company.checklist.push({ id: uid(), text: t.trim(), done: false }); }); setT(''); } }}>Ekle</Button>
    </div>
  );
}
