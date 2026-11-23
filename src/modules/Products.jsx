import { useMemo, useState } from 'react';
import { Plus, ShoppingBag, Pencil, Trash2, Copy, FolderHeart, ImagePlus, X, Search } from 'lucide-react';
import { useStore } from '../store.jsx';
import { emptyProduct, PRODUCT_CATEGORIES, MATERIAL_CATEGORIES } from '../lib/seed.js';
import { bomCost, ownCost, priceStatus } from '../lib/calc.js';
import { money, number, uid, unitShort } from '../lib/format.js';
import {
  PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Select, Modal, Tabs, Empty, Badge, Notice, Row, confirmDelete,
} from '../ui.jsx';

function resizeImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function BomEditor({ product, onChange }) {
  const { state } = useStore();
  const cost = bomCost(state, product);
  const options = MATERIAL_CATEGORIES.map((c) => ({
    label: c.label,
    items: state.materials.filter((m) => m.category === c.id),
  }));
  const setLine = (i, patch) => onChange({ ...product, bom: product.bom.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
  const add = () =>
    onChange({ ...product, bom: [...product.bom, { id: uid(), materialId: '', qty: 0, waste: state.settings.defaultWaste ?? 10 }] });

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ minWidth: 200 }}>Malzeme</th>
              <th className="num">Miktar</th>
              <th className="num">Fire %</th>
              <th className="num">Birim fiyat</th>
              <th className="num">Tutar</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cost.lines.map((l, i) => {
              const st = l.material ? priceStatus(l.material, state.settings.staleDays) : null;
              return (
                <tr key={l.id || i}>
                  <td className="cell-input">
                    <select value={l.materialId} onChange={(e) => setLine(i, { materialId: e.target.value })}>
                      <option value="">Malzeme seçin…</option>
                      {options.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                          {g.items.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </td>
                  <td className="cell-input num" style={{ width: 120 }}>
                    <NumberInput value={l.qty} onChange={(v) => setLine(i, { qty: v })} suffix={unitShort(l.material?.unit)} />
                  </td>
                  <td className="cell-input num" style={{ width: 90 }}>
                    <NumberInput value={l.waste} onChange={(v) => setLine(i, { waste: v })} suffix="%" />
                  </td>
                  <td className="num">
                    {l.hasPrice ? money(l.material.price) : <Badge tone="warn">Fiyat yok</Badge>}
                    {st && st.key !== 'guncel' && l.hasPrice && <div><Badge tone={st.tone}>{st.label}</Badge></div>}
                  </td>
                  <td className="num"><strong>{l.hasPrice ? money(l.cost) : '—'}</strong></td>
                  <td>
                    <IconButton icon={Trash2} tone="danger" label="Satırı sil" onClick={() => onChange({ ...product, bom: product.bom.filter((_, j) => j !== i) })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
          {cost.lines.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4}>Malzeme toplamı (fire dahil)</td>
                <td className="num">{money(cost.total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="hstack mt">
        <Button variant="secondary" icon={Plus} size="sm" onClick={add}>Malzeme ekle</Button>
        {cost.missing > 0 && <Badge tone="warn">{cost.missing} malzemenin fiyatı girilmemiş — toplam eksik</Badge>}
      </div>
    </>
  );
}

function ProductEditor({ initial, onClose }) {
  const { state, upsert } = useStore();
  const [p, setP] = useState(initial);
  const [tab, setTab] = useState('genel');
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  const cost = ownCost(state, p);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      set('photo')(await resizeImage(f));
    } catch {
      alert('Fotoğraf okunamadı.');
    }
  };

  const save = () => {
    if (!p.name.trim()) {
      alert('Ürün adı zorunludur.');
      setTab('genel');
      return;
    }
    upsert('products', { ...p, bom: p.bom.filter((l) => l.materialId) });
    onClose();
  };

  return (
    <Modal
      open
      wide
      title={initial.name ? initial.name : 'Yeni çanta modeli'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Vazgeç</Button>
          <Button onClick={save}>Kaydet</Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'genel', label: 'Genel bilgiler' },
          { value: 'yapi', label: 'Malzeme & yapı' },
          { value: 'maliyet', label: 'Maliyet hesabı', count: p.bom.length },
        ]}
      />
      {tab === 'genel' && (
        <div className="grid g-1-2">
          <label className="photo-drop">
            {p.photo ? <img src={p.photo} alt="" /> : (
              <div><ImagePlus size={28} strokeWidth={1.4} /><div className="small mt">Ürün fotoğrafı yükle</div></div>
            )}
            <input type="file" accept="image/*" onChange={onPhoto} />
            {p.photo && (
              <button type="button" className="icon-btn" style={{ position: 'absolute', top: 8, right: 8, background: '#fff' }}
                onClick={(e) => { e.preventDefault(); set('photo')(''); }} aria-label="Fotoğrafı kaldır">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="form-grid">
            <Field label="Ürün adı *"><TextInput value={p.name} onChange={set('name')} placeholder="ör. Rosé Mini Bag" /></Field>
            <Field label="Ürün kodu"><TextInput value={p.code} onChange={set('code')} placeholder="ör. RC-001" /></Field>
            <Field label="Koleksiyon">
              <Select value={p.collectionId} onChange={set('collectionId')} placeholder="Koleksiyonsuz"
                options={state.collections.map((c) => ({ value: c.id, label: c.name }))} />
            </Field>
            <Field label="Model kategorisi"><Select value={p.category} onChange={set('category')} options={PRODUCT_CATEGORIES} /></Field>
            <Field label="Renk seçenekleri" hint="Virgülle ayırın"><TextInput value={p.colors} onChange={set('colors')} placeholder="Pudra, Bordo, Krem" /></Field>
            <Field label="Tahmini üretim süresi"><NumberInput value={p.productionHours} onChange={set('productionHours')} suffix="saat" /></Field>
            <Field label="Genişlik"><NumberInput value={p.width} onChange={set('width')} suffix="cm" /></Field>
            <Field label="Yükseklik"><NumberInput value={p.height} onChange={set('height')} suffix="cm" /></Field>
            <Field label="Derinlik"><NumberInput value={p.depth} onChange={set('depth')} suffix="cm" /></Field>
            <Field label="Tasarım notları" wide>
              <textarea value={p.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Silüet, dikiş detayları, ilham…" />
            </Field>
          </div>
        </div>
      )}
      {tab === 'yapi' && (
        <div className="form-grid">
          <Field label="Kullanılacak kumaş"><TextInput value={p.fabric} onChange={set('fabric')} placeholder="ör. Kadife" /></Field>
          <Field label="Kullanılacak deri"><TextInput value={p.leather} onChange={set('leather')} placeholder="ör. Vegan deri – pudra" /></Field>
          <Field label="Astar türü"><TextInput value={p.lining} onChange={set('lining')} placeholder="ör. Saten astar" /></Field>
          <Field label="Fermuar türü"><TextInput value={p.zipper} onChange={set('zipper')} placeholder="ör. 5 no metal, altın" /></Field>
          <Field label="Askı modeli"><TextInput value={p.strap} onChange={set('strap')} placeholder="ör. Zincir + ayarlanabilir deri askı" /></Field>
          <Field label="Metal aksesuarlar"><TextInput value={p.hardware} onChange={set('hardware')} placeholder="ör. D halkası ×2, logo plakası" /></Field>
          <Field label="İç cep sayısı"><NumberInput value={p.innerPockets} onChange={set('innerPockets')} /></Field>
          <Field label="Dış cep sayısı"><NumberInput value={p.outerPockets} onChange={set('outerPockets')} /></Field>
          <Field label="Ambalaj maliyeti (adet)" hint="Kutu, toz torbası, kart vb."><NumberInput value={p.packagingCost} onChange={set('packagingCost')} suffix="₺" /></Field>
        </div>
      )}
      {tab === 'maliyet' && (
        <div className="stack">
          <Notice>
            Malzeme listesini (reçete) burada oluşturun. Fiyatlar <a href="#/malzemeler">Malzeme kataloğundan</a> gelir; katalogda
            fiyat değişince bu ürünün maliyeti otomatik güncellenir.
          </Notice>
          <BomEditor product={p} onChange={setP} />
          <Card title="Kendim üretirsem birim maliyet" className="mt">
            <Row label="Malzemeler (fire dahil)" value={money(cost.bom.total)} />
            <Row label={`Elektrik (${number(cost.hours)} saat)`} value={money(cost.electricity)} />
            <Row label="İşçilik" value={money(cost.labor)} />
            <Row label="Üretim maliyeti (ambalaj hariç)" value={money(cost.productionCost)} strong />
            <Row label="Ambalaj" value={money(cost.packaging)} />
            <div className="row-line total"><span>Birim maliyet</span><span>{money(cost.withPackaging)}</span></div>
            <p className="tiny muted mt">İlk yatırım payı dahil hesap ve detaylar için “Kendim Üretirsem” modülüne bakın.</p>
          </Card>
        </div>
      )}
    </Modal>
  );
}

function CollectionsModal({ onClose }) {
  const { state, update } = useStore();
  const [name, setName] = useState('');
  return (
    <Modal open title="Koleksiyonlar" onClose={onClose} footer={<Button onClick={onClose}>Tamam</Button>}>
      <div className="stack">
        {state.collections.map((c, i) => (
          <div key={c.id} className="hstack" style={{ flexWrap: 'nowrap' }}>
            <input type="color" value={c.color} style={{ width: 36, height: 36, border: 0, background: 'none', padding: 0 }}
              onChange={(e) => update((d) => { d.collections[i].color = e.target.value; })} />
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              <TextInput value={c.name} onChange={(v) => update((d) => { d.collections[i].name = v; })} />
              <TextInput value={c.description} placeholder="Açıklama" onChange={(v) => update((d) => { d.collections[i].description = v; })} />
            </div>
            <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => {
              if (!confirmDelete(`“${c.name}” koleksiyonu`)) return;
              update((d) => {
                d.collections = d.collections.filter((x) => x.id !== c.id);
                d.products.forEach((p) => { if (p.collectionId === c.id) p.collectionId = ''; });
              });
            }} />
          </div>
        ))}
        <div className="hstack">
          <div style={{ flex: 1 }}><TextInput value={name} onChange={setName} placeholder="Yeni koleksiyon adı" /></div>
          <Button icon={Plus} variant="secondary" onClick={() => {
            if (!name.trim()) return;
            update((d) => { d.collections.push({ id: uid(), name: name.trim(), description: '', color: '#d99aa5' }); });
            setName('');
          }}>Ekle</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Products() {
  const { state, remove, upsert } = useStore();
  const [editing, setEditing] = useState(null);
  const [colls, setColls] = useState(false);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      state.products.filter(
        (p) =>
          (filter === 'all' || p.collectionId === filter || (filter === 'none' && !p.collectionId)) &&
          (!q || `${p.name} ${p.code} ${p.category}`.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')))
      ),
    [state.products, filter, q]
  );

  return (
    <>
      <PageHeader
        eyebrow="Modül 2"
        title="Çanta Tasarım ve Ürün Kütüphanesi"
        subtitle="Modellerinizi koleksiyonlara ayırın; her ürünün malzeme reçetesi ve maliyeti otomatik hesaplanır."
        actions={
          <>
            <Button variant="secondary" icon={FolderHeart} onClick={() => setColls(true)}>Koleksiyonlar</Button>
            <Button icon={Plus} onClick={() => setEditing(emptyProduct())}>Yeni model</Button>
          </>
        }
      />

      <div className="hstack mb">
        <div className="chips">
          <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tümü · {state.products.length}</button>
          {state.collections.map((c) => (
            <button key={c.id} className={`chip ${filter === c.id ? 'active' : ''}`} onClick={() => setFilter(c.id)}>
              <span className="coll-dot" style={{ background: c.color }} />
              {c.name} · {state.products.filter((p) => p.collectionId === c.id).length}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="input-wrap" style={{ width: 240 }}>
          <TextInput value={q} onChange={setQ} placeholder="Ürün ara…" />
          <span className="suffix"><Search size={14} /></span>
        </div>
      </div>

      {list.length === 0 ? (
        <Card>
          <Empty icon={ShoppingBag} title="Henüz model yok" text="İlk çanta modelinizi oluşturun; malzeme reçetesini girince maliyeti otomatik hesaplanır."
            action={<Button icon={Plus} onClick={() => setEditing(emptyProduct())}>Yeni model</Button>} />
        </Card>
      ) : (
        <div className="product-grid">
          {list.map((p) => {
            const c = state.collections.find((x) => x.id === p.collectionId);
            const cost = ownCost(state, p);
            return (
              <article key={p.id} className="product-card" onClick={() => setEditing(structuredClone(p))}>
                <div className="product-photo">
                  {p.photo ? <img src={p.photo} alt={p.name} /> : <ShoppingBag size={42} strokeWidth={1.1} />}
                </div>
                <div className="product-info">
                  <div className="hstack" style={{ justifyContent: 'space-between' }}>
                    <span className="tiny muted">{p.code || 'Kodsuz'} · {p.category}</span>
                    {c && <Badge tone="brand"><span className="coll-dot" style={{ background: c.color }} />{c.name.replace(' Collection', '')}</Badge>}
                  </div>
                  <h4>{p.name}</h4>
                  {p.colors && <div className="tiny muted">{p.colors}</div>}
                  <div className="product-meta">
                    <div>
                      <div className="tiny muted">Birim maliyet</div>
                      <strong className="mono">{cost.incomplete && cost.bom.total === 0 ? '—' : money(cost.withPackaging)}</strong>
                      {cost.incomplete && <div><Badge tone="warn">Eksik fiyat</Badge></div>}
                    </div>
                    <div className="hstack" onClick={(e) => e.stopPropagation()}>
                      <IconButton icon={Pencil} label="Düzenle" onClick={() => setEditing(structuredClone(p))} />
                      <IconButton icon={Copy} label="Kopyala" onClick={() => upsert('products', { ...structuredClone(p), id: uid(), name: `${p.name} (kopya)`, code: '' })} />
                      <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete(`“${p.name}”`) && remove('products', p.id)} />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && <ProductEditor initial={editing} onClose={() => setEditing(null)} />}
      {colls && <CollectionsModal onClose={() => setColls(false)} />}
    </>
  );
}
