import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, ExternalLink, Search, History, Globe, Layers } from 'lucide-react';
import { useStore } from '../store.jsx';
import { MATERIAL_CATEGORIES, UNITS } from '../lib/seed.js';
import { priceStatus } from '../lib/calc.js';
import { money, date, today, uid, number, unitShort } from '../lib/format.js';
import { searchLinks, PRICE_PROVIDERS } from '../lib/priceResearch.js';
import {
  PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Select, Modal, Tabs, Badge, Notice, Empty, confirmDelete,
} from '../ui.jsx';

const SOURCES = [
  { value: 'manuel', label: 'Manuel giriş (kendi araştırmam)' },
  { value: 'teklif', label: 'Tedarikçi teklifi / fatura' },
  { value: 'web', label: 'İnternet sitesi fiyatı' },
  { value: 'tahmini', label: 'Tahmini (doğrulanmadı)' },
];

function MaterialEditor({ initial, onClose }) {
  const { upsert } = useStore();
  const [m, setM] = useState(initial);
  const set = (k) => (v) => setM((x) => ({ ...x, [k]: v }));
  const priceChanged = m.price !== initial.price || m.supplier !== initial.supplier;

  const save = () => {
    if (!m.name.trim()) return alert('Malzeme adı zorunludur.');
    if (m.price !== null && m.priceSource !== 'tahmini' && !m.supplier && !m.url) {
      if (!window.confirm('Fiyat için satıcı veya bağlantı girilmedi. Kaynaksız fiyat “Kaynak yok” olarak işaretlenecek. Devam edilsin mi?')) return;
    }
    let next = { ...m };
    if (priceChanged && m.price !== null) {
      next.updatedAt = m.updatedAt && m.updatedAt !== initial.updatedAt ? m.updatedAt : today();
      next.history = [
        { id: uid(), date: next.updatedAt, price: m.price, supplier: m.supplier, source: m.priceSource, url: m.url },
        ...(m.history || []),
      ].slice(0, 30);
    }
    upsert('materials', next);
    onClose();
  };

  return (
    <Modal open title={initial.name || 'Yeni malzeme'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={save}>Kaydet</Button></>}>
      <div className="form-grid cols-2">
        <Field label="Malzeme adı *" wide><TextInput value={m.name} onChange={set('name')} /></Field>
        <Field label="Kategori"><Select value={m.category} onChange={set('category')} options={MATERIAL_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} /></Field>
        <Field label="Satış birimi"><Select value={m.unit} onChange={set('unit')} options={UNITS} /></Field>
        <Field label="Birim fiyatı" hint="Boş bırakırsanız “Fiyat girilmedi” görünür"><NumberInput value={m.price} allowNull onChange={set('price')} suffix="₺" /></Field>
        <Field label="Fiyat kaynağı"><Select value={m.priceSource} onChange={set('priceSource')} options={SOURCES} /></Field>
        <Field label="Satıcı / tedarikçi"><TextInput value={m.supplier} onChange={set('supplier')} placeholder="ör. Merter – X Deri" /></Field>
        <Field label="Fiyatın son kontrol tarihi"><input type="date" value={m.updatedAt || ''} onChange={(e) => set('updatedAt')(e.target.value)} /></Field>
        <Field label="Satın alınan miktar"><NumberInput value={m.purchasedQty} onChange={set('purchasedQty')} suffix={unitShort(m.unit)} /></Field>
        <Field label="Minimum sipariş miktarı" hint="Satıcının en az satış miktarı"><NumberInput value={m.moq} onChange={set('moq')} suffix={unitShort(m.unit)} /></Field>
        <Field label="Kullanılabilir stok" hint="Elinizde hazır bulunan miktar"><NumberInput value={m.stockQty} onChange={set('stockQty')} suffix={unitShort(m.unit)} /></Field>
        <Field label="Ürün bağlantısı"><input type="url" value={m.url || ''} onChange={(e) => set('url')(e.target.value)} placeholder="https://" /></Field>
        <Field label="Açıklama" wide><textarea value={m.description} onChange={(e) => set('description')(e.target.value)} placeholder="En, kalınlık, renk kodu, minimum alım…" /></Field>
      </div>
      {m.priceSource === 'tahmini' && (
        <Notice tone="warn" title="Tahmini fiyat">Bu fiyat tüm hesaplarda “Tahmini – doğrulanmadı” etiketiyle görünecek.</Notice>
      )}
      {(m.history || []).length > 0 && (
        <>
          <div className="section-title">Fiyat geçmişi</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Tarih</th><th className="num">Fiyat</th><th>Satıcı</th><th>Kaynak</th></tr></thead>
              <tbody>
                {m.history.map((h) => (
                  <tr key={h.id}>
                    <td>{date(h.date)}</td>
                    <td className="num">{money(h.price)}</td>
                    <td>{h.url ? <a href={h.url} target="_blank" rel="noreferrer">{h.supplier || 'Bağlantı'}</a> : h.supplier || '—'}</td>
                    <td>{SOURCES.find((s) => s.value === h.source)?.label.split(' (')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

function ResearchModal({ material, onClose }) {
  const { upsert } = useStore();
  const [price, setPrice] = useState(null);
  const [supplier, setSupplier] = useState('');
  const [url, setUrl] = useState('');
  const links = searchLinks(material.name);
  const save = () => {
    if (price === null || !(supplier || url)) return alert('Fiyat ile birlikte satıcı veya bağlantı girin — kaynaksız fiyat kaydedilmez.');
    const d = today();
    upsert('materials', {
      ...material, price, supplier, url, priceSource: 'web', updatedAt: d,
      history: [{ id: uid(), date: d, price, supplier, source: 'web', url }, ...(material.history || [])].slice(0, 30),
    });
    onClose();
  };
  return (
    <Modal open title={`Fiyat araştır: ${material.name}`} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Kapat</Button><Button onClick={save}>Bulunan fiyatı kaydet</Button></>}>
      <div className="stack">
        <div>
          <div className="section-title">1 · Kaynaklarda ara</div>
          <div className="link-list">
            {links.map((l) => (
              <a key={l.name} className="link-pill" href={l.url} target="_blank" rel="noreferrer"><Globe size={13} />{l.name}</a>
            ))}
          </div>
          <p className="tiny muted mt">Bağlantılar yeni sekmede açılır. Birim (metre/m²/adet) ve en bilgisini karşılaştırmayı unutmayın.</p>
        </div>
        <div>
          <div className="section-title">2 · Doğruladığınız fiyatı kaynağıyla girin</div>
          <div className="form-grid cols-2">
            <Field label={`Fiyat (${material.unit} başına)`}><NumberInput value={price} allowNull onChange={setPrice} suffix="₺" /></Field>
            <Field label="Satıcı"><TextInput value={supplier} onChange={setSupplier} /></Field>
            <Field label="Ürün bağlantısı" wide><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
          </div>
        </div>
        <Notice>
          Kayıt bugünün tarihiyle ({date(today())}) ve “İnternet sitesi fiyatı” kaynağıyla saklanır; {''}
          eski fiyat geçmişte kalır.
        </Notice>
      </div>
    </Modal>
  );
}

export default function Materials() {
  const { state, remove } = useStore();
  const [cat, setCat] = useState('kumas');
  const [editing, setEditing] = useState(null);
  const [research, setResearch] = useState(null);
  const [q, setQ] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const stale = state.settings.staleDays || 90;

  const counts = useMemo(() => {
    const c = { yok: 0, eski: 0, guncel: 0, other: 0 };
    state.materials.forEach((m) => {
      const k = priceStatus(m, stale).key;
      if (k in c) c[k]++;
      else c.other++;
    });
    return c;
  }, [state.materials, stale]);

  const list = state.materials.filter(
    (m) =>
      (cat === 'all' || m.category === cat) &&
      (!q || m.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))) &&
      (!onlyIssues || priceStatus(m, stale).key !== 'guncel')
  );

  const blank = () => ({
    id: uid(), category: cat === 'all' ? 'kumas' : cat, name: '', unit: 'adet', price: null, priceSource: 'manuel',
    supplier: '', purchasedQty: 0, moq: 0, stockQty: 0, updatedAt: '', url: '', description: '', history: [],
  });

  return (
    <>
      <PageHeader
        eyebrow="Modül 3"
        title="Malzeme ve Tedarikçi Kataloğu"
        subtitle="Her fiyat kaynağı ve güncelleme tarihiyle saklanır. Doğrulanmamış veya eski fiyatlar açıkça işaretlenir."
        actions={<Button icon={Plus} onClick={() => setEditing(blank())}>Yeni malzeme</Button>}
      />

      <div className="stats mb">
        <div className="stat"><div className="stat-label">Toplam malzeme</div><div className="stat-value">{state.materials.length}</div></div>
        <div className="stat"><div className="stat-label">Güncel fiyatlı</div><div className="stat-value pos-text">{counts.guncel}</div></div>
        <div className="stat"><div className="stat-label">Fiyat girilmemiş</div><div className="stat-value">{counts.yok}</div></div>
        <div className="stat"><div className="stat-label">{`Eski (>${stale} gün) / kaynaksız / tahmini`}</div><div className="stat-value neg-text">{counts.eski + counts.other}</div></div>
      </div>

      <Notice title="Fiyat araştırma altyapısı">
        Her malzemede <Search size={12} /> düğmesi pazaryeri ve fiyat karşılaştırma sitelerinde arama açar; bulduğunuz fiyatı kaynağıyla kaydedersiniz.
        Otomatik fiyat çekme için sağlayıcı arayüzü hazırdır ({PRICE_PROVIDERS.map((p) => p.name).join(', ')}); tarayıcı güvenlik kuralları
        nedeniyle otomatik çekim bir sunucu/API anahtarı gerektirir. O zamana kadar hiçbir fiyat otomatik uydurulmaz.
      </Notice>

      <div className="hstack mt mb">
        <Tabs
          value={cat}
          onChange={setCat}
          tabs={[
            ...MATERIAL_CATEGORIES.map((c) => ({ value: c.id, label: c.label, count: state.materials.filter((m) => m.category === c.id).length })),
            { value: 'all', label: 'Tümü' },
          ]}
        />
        <div className="spacer" />
        <label className="hstack small" style={{ cursor: 'pointer', marginBottom: 18 }}>
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Sadece güncellenmesi gerekenler
        </label>
        <div style={{ width: 220, marginBottom: 18 }}><TextInput value={q} onChange={setQ} placeholder="Malzeme ara…" /></div>
      </div>

      <Card pad={false}>
        {list.length === 0 ? (
          <Empty icon={Layers} title="Malzeme bulunamadı" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Malzeme</th>
                  <th className="num">Birim fiyat</th>
                  <th>Birim</th>
                  <th>Satıcı / tedarikçi</th>
                  <th className="num">Stok / MOQ</th>
                  <th>Durum</th>
                  <th>Güncelleme</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((m) => {
                  const st = priceStatus(m, stale);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{m.name}</div>
                        {m.description && <div className="tiny muted" style={{ maxWidth: 280 }}>{m.description}</div>}
                      </td>
                      <td className="num"><strong>{m.price === null ? '—' : money(m.price)}</strong></td>
                      <td>{m.unit}</td>
                      <td>
                        {m.url ? <a href={m.url} target="_blank" rel="noreferrer" className="hstack" style={{ gap: 4 }}>{m.supplier || 'Bağlantı'} <ExternalLink size={12} /></a> : m.supplier || <span className="muted">—</span>}
                      </td>
                      <td className="num">{number(m.stockQty || 0)} / {number(m.moq || 0)}</td>
                      <td><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="nowrap">{date(m.updatedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <IconButton icon={Search} label="Fiyat araştır" onClick={() => setResearch(m)} />
                          {(m.history || []).length > 0 && <IconButton icon={History} label="Fiyat geçmişi" onClick={() => setEditing(structuredClone(m))} />}
                          <IconButton icon={Pencil} label="Düzenle" onClick={() => setEditing(structuredClone(m))} />
                          <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => {
                            const used = state.products.filter((p) => p.bom.some((l) => l.materialId === m.id));
                            if (used.length && !window.confirm(`Bu malzeme ${used.length} ürünün reçetesinde kullanılıyor. Yine de silinsin mi?`)) return;
                            if (!used.length && !confirmDelete(`“${m.name}”`)) return;
                            remove('materials', m.id);
                          }} />
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

      {editing && <MaterialEditor initial={editing} onClose={() => setEditing(null)} />}
      {research && <ResearchModal material={research} onClose={() => setResearch(null)} />}
    </>
  );
}
