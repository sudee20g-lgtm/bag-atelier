import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Search, Wrench } from 'lucide-react';
import { useStore } from '../store.jsx';
import { EQUIPMENT_CATEGORIES } from '../lib/seed.js';
import { investment } from '../lib/calc.js';
import { searchLinks } from '../lib/priceResearch.js';
import { money, uid, n } from '../lib/format.js';
import {
  PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Select, Modal, Badge, Stat, Empty, Tabs, confirmDelete,
} from '../ui.jsx';

const STATUS = [
  { value: 'arastiriliyor', label: 'Araştırılıyor', tone: 'muted' },
  { value: 'planlandi', label: 'Planlandı (yatırıma dahil)', tone: 'warn' },
  { value: 'alindi', label: 'Alındı', tone: 'ok' },
  { value: 'vazgecildi', label: 'Vazgeçildi', tone: 'danger' },
];
const COND = [
  { value: 'sifir', label: 'Sıfır' },
  { value: 'ikinci', label: 'İkinci el' },
];

function EquipmentEditor({ initial, onClose }) {
  const { upsert } = useStore();
  const [e, setE] = useState(initial);
  const set = (k) => (v) => setE((x) => ({ ...x, [k]: v }));
  return (
    <Modal open title={initial.name || 'Yeni ekipman'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={() => { if (!e.name.trim()) return alert('Ekipman adı zorunludur.'); upsert('equipment', e); onClose(); }}>Kaydet</Button></>}>
      <div className="form-grid cols-2">
        <Field label="Kategori" wide><Select value={e.category} onChange={set('category')} options={EQUIPMENT_CATEGORIES} /></Field>
        <Field label="Ekipman adı *"><TextInput value={e.name} onChange={set('name')} /></Field>
        <Field label="Durum"><Select value={e.status} onChange={set('status')} options={STATUS} /></Field>
        <Field label="Marka"><TextInput value={e.brand} onChange={set('brand')} /></Field>
        <Field label="Model"><TextInput value={e.model} onChange={set('model')} /></Field>
        <Field label="Sıfır / ikinci el"><Select value={e.condition} onChange={set('condition')} options={COND} /></Field>
        <Field label="Fiyat"><NumberInput value={e.price} allowNull onChange={set('price')} suffix="₺" /></Field>
        <Field label="Güç tüketimi" hint="Elektrik hesabı için (opsiyonel)"><NumberInput value={e.watt} onChange={set('watt')} suffix="W" /></Field>
        <Field label="Ürün bağlantısı"><input type="url" value={e.url || ''} onChange={(x) => set('url')(x.target.value)} placeholder="https://" /></Field>
        <Field label="Kullanım amacı" wide><TextInput value={e.purpose} onChange={set('purpose')} placeholder="ör. Kalın deri ve çok katlı dikiş" /></Field>
        <Field label="Notlar" wide><textarea value={e.notes} onChange={(x) => set('notes')(x.target.value)} placeholder="Satıcı, garanti, servis, ikinci el durumu…" /></Field>
      </div>
      <div className="section-title">Fiyat araştır</div>
      <div className="link-list">
        {searchLinks([e.brand, e.model, e.name].filter(Boolean).join(' ')).map((l) => (
          <a key={l.name} className="link-pill" href={l.url} target="_blank" rel="noreferrer"><Search size={12} />{l.name}</a>
        ))}
      </div>
    </Modal>
  );
}

export default function Equipment() {
  const { state, remove } = useStore();
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('liste');
  const inv = investment(state);

  const compare = useMemo(
    () =>
      EQUIPMENT_CATEGORIES.map((cat) => {
        const items = state.equipment.filter((e) => e.category === cat && e.price !== null && e.price !== '' && e.status !== 'vazgecildi');
        const stat = (cond) => {
          const arr = items.filter((e) => e.condition === cond).map((e) => n(e.price));
          return arr.length ? { min: Math.min(...arr), avg: arr.reduce((a, b) => a + b, 0) / arr.length, count: arr.length } : null;
        };
        return { cat, sifir: stat('sifir'), ikinci: stat('ikinci') };
      }),
    [state.equipment]
  );
  const cheapestNew = compare.reduce((a, c) => a + (c.sifir?.min || 0), 0);
  const cheapestMix = compare.reduce((a, c) => a + (Math.min(c.sifir?.min ?? Infinity, c.ikinci?.min ?? Infinity) === Infinity ? 0 : Math.min(c.sifir?.min ?? Infinity, c.ikinci?.min ?? Infinity)), 0);

  const blank = (category = EQUIPMENT_CATEGORIES[0]) => ({
    id: uid(), category, name: '', brand: '', model: '', purpose: '', condition: 'sifir', price: null, url: '', status: 'arastiriliyor', watt: 0, notes: '',
  });

  return (
    <>
      <PageHeader
        eyebrow="Modül 6"
        title="Dikiş Atölyesi ve Ekipmanlar"
        subtitle="Kendi üretiminiz için gereken makine ve araçlar. “Planlandı” ve “Alındı” durumundakiler ilk yatırıma eklenir."
        actions={<Button icon={Plus} onClick={() => setEditing(blank())}>Ekipman ekle</Button>}
      />
      <div className="stats mb">
        <Stat tone="feature" label="Planlanan ilk yatırım" value={money(inv.total)} icon={Wrench} hint={`${inv.items.length} kalem${inv.missing ? ` · ${inv.missing} fiyatsız` : ''}`} />
        <Stat label="Alınanlar" value={money(state.equipment.filter((e) => e.status === 'alindi').reduce((a, e) => a + n(e.price), 0))} />
        <Stat label="En ucuz set · hepsi sıfır" value={money(cheapestNew)} hint="Fiyatı girilen kategorilerde" />
        <Stat tone="pink" label="En ucuz set · sıfır/2. el karışık" value={money(cheapestMix)} hint="Her kategoride en düşük fiyat" />
      </div>

      <Tabs value={view} onChange={setView} tabs={[{ value: 'liste', label: 'Ekipman listesi', count: state.equipment.length }, { value: 'karsilastir', label: 'Sıfır vs ikinci el' }]} />

      {view === 'liste' && (
        <div className="stack">
          {EQUIPMENT_CATEGORIES.map((cat) => {
            const items = state.equipment.filter((e) => e.category === cat);
            return (
              <Card key={cat} title={cat} actions={<Button variant="ghost" size="sm" icon={Plus} onClick={() => setEditing(blank(cat))}>Ekle</Button>} pad={false}>
                {items.length === 0 ? (
                  <div className="card-body muted small">Bu kategoride kayıt yok.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Ekipman</th><th>Marka / model</th><th>Kullanım amacı</th><th>Durum</th><th>Tür</th><th className="num">Fiyat</th><th /></tr></thead>
                      <tbody>
                        {items.map((e) => {
                          const st = STATUS.find((s) => s.value === e.status);
                          return (
                            <tr key={e.id}>
                              <td><strong>{e.name}</strong></td>
                              <td>{[e.brand, e.model].filter(Boolean).join(' · ') || <span className="muted">—</span>}</td>
                              <td className="small" style={{ maxWidth: 260 }}>{e.purpose || <span className="muted">—</span>}</td>
                              <td><Badge tone={st?.tone}>{st?.label.split(' (')[0]}</Badge></td>
                              <td><Badge tone={e.condition === 'ikinci' ? 'info' : 'muted'}>{e.condition === 'ikinci' ? 'İkinci el' : 'Sıfır'}</Badge></td>
                              <td className="num"><strong>{e.price === null || e.price === '' ? '—' : money(e.price)}</strong></td>
                              <td>
                                <div className="row-actions">
                                  {e.url && <a className="icon-btn" href={e.url} target="_blank" rel="noreferrer" title="Bağlantı"><ExternalLink size={15} /></a>}
                                  <IconButton icon={Pencil} label="Düzenle" onClick={() => setEditing(structuredClone(e))} />
                                  <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete(`“${e.name}”`) && remove('equipment', e.id)} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {view === 'karsilastir' && (
        <Card title="Kategori bazında sıfır ve ikinci el karşılaştırması" subtitle="Aynı kategoriye hem sıfır hem ikinci el seçenek ekleyerek karşılaştırın" pad={false}>
          {compare.every((c) => !c.sifir && !c.ikinci) ? (
            <Empty icon={Wrench} title="Karşılaştırılacak fiyat yok" text="Ekipmanlara fiyat girin; ikinci el seçenekleri ayrı kayıt olarak ekleyin." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Kategori</th><th className="num">Sıfır · en düşük</th><th className="num">Sıfır · ortalama</th><th className="num">2. el · en düşük</th><th className="num">2. el · ortalama</th><th className="num">Tasarruf</th></tr>
                </thead>
                <tbody>
                  {compare.map((c) => {
                    const save = c.sifir && c.ikinci ? c.sifir.min - c.ikinci.min : null;
                    return (
                      <tr key={c.cat}>
                        <td>{c.cat}</td>
                        <td className="num">{c.sifir ? money(c.sifir.min) : '—'}</td>
                        <td className="num muted">{c.sifir ? `${money(c.sifir.avg)} (${c.sifir.count})` : '—'}</td>
                        <td className="num">{c.ikinci ? money(c.ikinci.min) : '—'}</td>
                        <td className="num muted">{c.ikinci ? `${money(c.ikinci.avg)} (${c.ikinci.count})` : '—'}</td>
                        <td className={`num ${save > 0 ? 'pos-text' : save < 0 ? 'neg-text' : ''}`}>{save === null ? '—' : money(save)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="card-body tiny muted">İkinci el makinelerde servis, yedek parça ve garanti maliyetlerini notlara ekleyin; tasarruf sütunu yalnızca alış fiyatını karşılaştırır.</div>
        </Card>
      )}
      {editing && <EquipmentEditor initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
