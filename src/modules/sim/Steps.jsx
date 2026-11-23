import { Scissors, Factory, Building2, Shuffle, Home, Store, Users, Globe, ShoppingBag, Instagram, ExternalLink, Search, Plus, Trash2, Copy } from 'lucide-react';
import {
  MODELS, COMPANY, EMPLOYMENT, SETUP_ITEMS, RECURRING_ITEMS, MACHINES, EXTRAS, BRAND_ITEMS, MARKETING_ITEMS, WORKSPACES, WORKSPACE_ITEMS,
  hasOwn, fasonUnit, newRecipeLine,
} from '../../lib/simulator.js';
import { MATERIAL_CATEGORIES } from '../../lib/seed.js';
import { priceStatus, param } from '../../lib/calc.js';
import { searchLinks } from '../../lib/priceResearch.js';
import { money, money0, number, date, today, uid, n, unitShort } from '../../lib/format.js';
import { Card, Field, NumberInput, TextInput, Select, Toggle, Notice, Badge, Button, IconButton } from '../../ui.jsx';
import { useSim, StepHead, ItemRow, ChoiceCard, KindLegend, SrcBadge } from './common.jsx';

const MODEL_ICONS = { kendim: Scissors, atolye: Factory, firma: Building2, hibrit: Shuffle };

/* ---------- 1. İş modeli ---------- */
export function StepModel() {
  const { cfg, patch } = useSim();
  return (
    <>
      <StepHead n={1} title="İş modeli seçimi" text="Üretimi nasıl yapacağınızı seçin. Sonraki adımlar bu seçime göre değişir." />
      <div className="choice-grid">
        {MODELS.map((m) => (
          <ChoiceCard key={m.id} icon={MODEL_ICONS[m.id]} active={cfg.model === m.id} title={m.label} desc={m.desc} onClick={() => patch((c) => { c.model = m.id; })} />
        ))}
      </div>
      {cfg.model === 'hibrit' && (
        <Card title="Üretim dağılımı" className="mt">
          <Field label={`Kendi ürettiğim pay: %${cfg.hybridOwnPct} · Dışarıda üretilen: %${100 - n(cfg.hybridOwnPct)}`}>
            <input type="range" min="0" max="100" step="5" value={cfg.hybridOwnPct} onChange={(e) => patch((c) => { c.hybridOwnPct = Number(e.target.value); })} />
          </Field>
        </Card>
      )}
      <Notice tone="info" title="Bu seçim neyi değiştirir?">
        {hasOwn(cfg) ? 'Makine ve ekipman adımı açılır; işçilik maliyeti hesaba girer. ' : 'Makine adımı atlanır. '}
        {cfg.model !== 'kendim' ? 'Fason üretim adımı açılır; numune ve kalıp başlangıç yatırımına eklenir.' : 'Fason adımı atlanır.'}
      </Notice>
    </>
  );
}

/* ---------- 2. Şirket ve resmî giderler ---------- */
export function StepCompany() {
  const { state, cfg, patch, result } = useSim();
  const co = cfg.company;
  const setCo = (k) => (v) => patch((c) => { c.company[k] = v; });
  const ye = result.ye;
  const bk = result.bagkur;
  const minCap = co.type === 'limited' ? 50000 : co.type === 'anonim' ? 250000 : 0;

  return (
    <>
      <StepHead n={2} title="Şirket kuruluşu ve resmî giderler" text="Zorunlu kalemler otomatik eklenir; koşullu kalemler durumunuza göre değişir." />
      <KindLegend />
      <div className="grid g2 mt">
        <Card title="Şirket türü">
          <div className="seg">
            {COMPANY.map((t) => <button key={t.id} className={co.type === t.id ? 'active' : ''} onClick={() => setCo('type')(t.id)}>{t.label}</button>)}
          </div>
          {co.type === 'sahis' && (
            <Field label="Oda kaydı türü" hint="Faaliyet ve kazanç durumuna göre belirlenir; mali müşavirinize danışın">
              <Select value={co.registry} onChange={setCo('registry')} options={[{ value: 'esnaf', label: 'Esnaf ve sanatkâr (esnaf odası)' }, { value: 'tacir', label: 'Tacir (ticaret sicili + TSO)' }]} />
            </Field>
          )}
          {co.type !== 'sahis' && (
            <Field label="Esas sermaye" hint={`Asgari ${money0(minCap)} (01.01.2024 itibarıyla). Sermaye bir gider değildir; şirket hesabında işletme için kullanılır.`}>
              <NumberInput value={co.capital} onChange={setCo('capital')} suffix="₺" />
            </Field>
          )}
          {co.type !== 'sahis' && n(co.capital) < minCap && <Notice tone="danger">Sermaye asgari tutarın altında.</Notice>}
        </Card>
        <Card title="Çalışma ve sigortalılık durumu" subtitle="SGK / Bağ-Kur yükümlülüğü buna göre hesaplanır">
          <div className="radio-list">
            {EMPLOYMENT.map((e) => (
              <label key={e.id} className={`radio ${co.employment === e.id ? 'active' : ''}`}>
                <input type="radio" checked={co.employment === e.id} onChange={() => setCo('employment')(e.id)} />
                <span><b>{e.label}</b><span className="tiny muted">{e.hint}</span></span>
              </label>
            ))}
          </div>
          {co.employment === 'yok' && (
            <div className="form-grid cols-2 mt">
              <Field label="Prime esas kazanç" hint={`Boşsa alt sınır: ${money(param(state, 'asgariBrut'))}`}><NumberInput value={co.bagkurBase} allowNull onChange={setCo('bagkurBase')} suffix="₺" /></Field>
              <Field label="İndirim"><Toggle checked={co.bagkurDiscount} onChange={setCo('bagkurDiscount')} label="Düzenli ödeme (5 puan)" /></Field>
            </div>
          )}
          {co.employment === 'emekli' && (
            <Field label="Aylık SGDP tutarı" hint="SGK’dan öğrenip girin"><NumberInput value={co.sgdp} onChange={setCo('sgdp')} suffix="₺/ay" /></Field>
          )}
          {co.employment === '4a' && (
            <Notice tone="warn" title="Ayrıca değerlendirilmesi gerekir">
              Başka bir işte 4/a kapsamında çalışırken işletme açmanız durumunda, 5510 s. Kanun md. 53 uyarınca kural olarak 4/a sigortalılığı esas alınır;
              aynı anda iki prim ödeneceği varsayılmamıştır. 4/a sona erdiğinde Bağ-Kur başlar. Durumunuzu SGK ve mali müşavirinizle doğrulayın.
            </Notice>
          )}
        </Card>
      </div>

      <div className="grid g2 mt">
        <Card title="Tek seferlik kuruluş giderleri">
          {SETUP_ITEMS.map((d) => {
            const line = result.startupGroups[0].lines.find((l) => l.key === d.key);
            const applies = d.applies ? d.applies(cfg) : true;
            if (d.auto === 'rekabet') {
              return <ItemRow key={d.key} def={d} applies={applies} auto={line?.amount ?? 0} autoNote={applies ? line?.note + ' — formülle hesaplandı (resmî oran).' : null} />;
            }
            const label = d.key === 'sicil_oda' && co.type === 'sahis' ? (co.registry === 'tacir' ? 'Ticaret sicili ve ticaret odası (tacir)' : 'Esnaf odası kaydı') : d.label;
            return <ItemRow key={d.key} def={{ ...d, label }} v={co.setup[d.key]} applies={applies} onChange={(p) => patch((c) => { Object.assign(c.company.setup[d.key], p); })} />;
          })}
          <div className="row-line total"><span>Kuruluş toplamı</span><span>{money(result.startupGroups[0].total)}</span></div>
        </Card>
        <Card title="Aylık ve yıllık resmî giderler">
          {RECURRING_ITEMS.map((d) => {
            const applies = d.applies ? d.applies(cfg) : true;
            if (d.auto === 'bagkur') return <ItemRow key={d.key} def={d} applies auto={bk.amount} autoNote={bk.note} />;
            return <ItemRow key={d.key} def={d} v={co.recurring[d.key]} applies={applies} onChange={(p) => patch((c) => { Object.assign(c.company.recurring[d.key], p); })} />;
          })}
        </Card>
      </div>

      <Card title="Genç Girişimci Kazanç İstisnası (GVK md. 20/A)" className="mt">
        <div className="form-grid cols-2">
          <Field label="Mükellefiyet başlangıcındaki yaşınız"><NumberInput value={co.age} allowNull onChange={setCo('age')} suffix="yaş" /></Field>
          <Field label="İlk kez mi vergi mükellefi oluyorsunuz?"><Toggle checked={co.firstTime} onChange={setCo('firstTime')} label={co.firstTime ? 'Evet, ilk kez' : 'Hayır, daha önce mükellefiyetim oldu'} /></Field>
        </div>
        <div className="mt">
          {ye.eligible ? (
            <Notice tone="brand" title="Ön şartları karşılıyor görünüyorsunuz">
              Yıllık {money0(ye.limit)} ’ye kadar kazanç, 3 vergilendirme dönemi boyunca gelir vergisinden istisna olabilir. Sonuç ekranında vergi payı buna göre düşürülür.
              Faaliyete bizzat katılma ve işi yakın akrabadan devralmamış olma şartlarını da sağlamanız gerekir.
            </Notice>
          ) : (
            <Notice tone="info" title="Şu an uygun görünmüyor">
              <ul style={{ margin: 0, paddingLeft: 18 }}>{ye.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </Notice>
          )}
          <p className="tiny muted mt">
            Tutar: {money0(ye.limit)} · {date(ye.param?.validFrom)} itibarıyla · Kaynak: {ye.param?.source} · Durum: {ye.param?.status === 'dogrulandi' ? 'doğrulandı' : 'doğrulanmalı'}.
            {' '}Şirket Kuruluş Merkezi › Mevzuat parametrelerinden güncelleyebilirsiniz. Gelir İdaresi Başkanlığı: <a href="https://www.gib.gov.tr" target="_blank" rel="noreferrer">gib.gov.tr</a>
          </p>
        </div>
      </Card>
    </>
  );
}

/* ---------- 3. Üretim ve makine ---------- */
export function StepProduction() {
  const { cfg, patch, result } = useSim();
  const p = cfg.production;
  const setP = (k) => (v) => patch((c) => { c.production[k] = v; });
  const setM = (key, k) => (v) => patch((c) => { c.production.machines[key][k] = v; if (k === 'selected' && v) c.production.noMachine = false; });
  const machineTotal = result.startupGroups.find((g) => g.key === 'makine').total;

  return (
    <>
      <StepHead n={3} title="Üretim yöntemi ve makine seçimi" text="Yalnızca ihtiyacınız olanları seçin; seçilmeyen ekipman maliyete eklenmez." />
      <Card title="Makine tercihi" subtitle="Birden fazla seçebilirsiniz">
        <label className={`radio ${p.noMachine ? 'active' : ''}`} style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={p.noMachine} onChange={(e) => patch((c) => { c.production.noMachine = e.target.checked; if (e.target.checked) Object.values(c.production.machines).forEach((m) => (m.selected = false)); })} />
          <span><b>Henüz makine almayacağım</b><span className="tiny muted">Mevcut makinenizi kullanacaksanız veya alımı erteliyorsanız.</span></span>
        </label>
        <div className="machine-grid">
          {MACHINES.map((m) => {
            const v = p.machines[m.key];
            return (
              <div key={m.key} className={`machine ${v.selected ? 'active' : ''}`}>
                <label className="machine-head">
                  <input type="checkbox" className="item-check" checked={v.selected} onChange={(e) => setM(m.key, 'selected')(e.target.checked)} />
                  <b>{m.label}</b>
                </label>
                {v.selected && (
                  <div className="form-grid cols-2" style={{ marginTop: 10 }}>
                    <Field label="Marka"><TextInput value={v.brand} onChange={setM(m.key, 'brand')} /></Field>
                    <Field label="Model"><TextInput value={v.model} onChange={setM(m.key, 'model')} /></Field>
                    <Field label="Durum"><Select value={v.condition} onChange={setM(m.key, 'condition')} options={[{ value: 'sifir', label: 'Sıfır' }, { value: 'ikinci', label: 'İkinci el' }]} /></Field>
                    <Field label="Satın alma fiyatı"><NumberInput value={v.price} onChange={setM(m.key, 'price')} suffix="₺" /></Field>
                    <Field label="Garanti"><TextInput value={v.warranty} onChange={setM(m.key, 'warranty')} placeholder="ör. 2 yıl" /></Field>
                    <Field label="Yıllık bakım maliyeti"><NumberInput value={v.maintenanceYearly} onChange={setM(m.key, 'maintenanceYearly')} suffix="₺/yıl" /></Field>
                    <div className="field wide hstack" style={{ justifyContent: 'space-between' }}>
                      <label className="est-chip"><input type="checkbox" checked={v.est} onChange={(e) => setM(m.key, 'est')(e.target.checked)} /> tutarlar tahmini</label>
                      <div className="link-list">
                        {searchLinks([v.brand, v.model, m.label].filter(Boolean).join(' ')).slice(0, 3).concat(searchLinks(m.label).slice(5, 6)).map((l) => (
                          <a key={l.name} className="link-pill" href={l.url} target="_blank" rel="noreferrer"><Search size={11} />{l.name}</a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Ek ekipmanlar" subtitle="İhtiyacınız olanları işaretleyip fiyatını girin" className="mt">
        {EXTRAS.map((d) => (
          <ItemRow key={d.key} def={{ ...d, kind: 'istege', freq: 'once' }} v={p.extras[d.key]} onChange={(x) => patch((c) => { Object.assign(c.production.extras[d.key], x); })} />
        ))}
        <div className="row-line total"><span>Makine ve ekipman toplamı</span><span>{money(machineTotal)}</span></div>
      </Card>

      <Card title="İşçilik" className="mt" subtitle="Kendi emeğiniz veya çalıştıracağınız kişinin işçiliği">
        <div className="form-grid">
          <Field label="Bir çantanın dikim süresi"><NumberInput value={p.laborHours} onChange={setP('laborHours')} suffix="saat" /></Field>
          <Field label="Saatlik işçilik değeri"><NumberInput value={p.hourlyRate} onChange={setP('hourlyRate')} suffix="₺/sa" /></Field>
          <Field label="Makine payının dağıtılacağı adet" hint="Yalnızca bilgi amaçlı amortisman gösterimi"><NumberInput value={p.amortUnits} onChange={setP('amortUnits')} suffix="adet" /></Field>
        </div>
        <div className="stack mt" style={{ gap: 10 }}>
          <Toggle checked={p.includeLabor} onChange={setP('includeLabor')} label="İşçiliği birim maliyete dahil et (önerilir — emeğinizin bedeli)" />
          <Toggle checked={p.laborIsCash} onChange={setP('laborIsCash')} label="İşçilik nakit ödenecek (usta/personel çalıştıracağım) — ilk üretim işçiliği başlangıç sermayesine eklenir" />
        </div>
        <Notice tone="info" title="Mükerrer hesap yok">
          Makine ve ekipman yalnızca başlangıç yatırımında sayılır; çanta maliyetine eklenmez. Ürün başına makine payı
          ({money(result.unit.machineShare)} / adet) sonuç ekranında ayrıca bilgi olarak gösterilir. Elektrik de çalışma alanı adımında aylık olarak bir kez sayılır.
        </Notice>
      </Card>
    </>
  );
}

/* ---------- 4. Malzeme ---------- */
function MaterialTable({ lines, listKey, categories, withWaste }) {
  const { state, patch, update } = useSim();
  const options = MATERIAL_CATEGORIES.filter((c) => categories.includes(c.id)).map((c) => ({ label: c.label, items: state.materials.filter((m) => m.category === c.id) }));
  const setLine = (i, k, v) => patch((c) => { c[listKey][i][k] = v; });
  const setMat = (id, p, priceChanged) =>
    update((d) => {
      const m = d.materials.find((x) => x.id === id);
      Object.assign(m, p);
      if (priceChanged) {
        m.updatedAt = today();
        if (m.priceSource === 'tahmini' || !m.priceSource) m.priceSource = 'manuel';
      }
    });
  const commitPriceHistory = (id) =>
    update((d) => {
      const m = d.materials.find((x) => x.id === id);
      if (!m || m.price === null) return;
      const last = (m.history || [])[0];
      if (last && last.price === m.price && last.date === m.updatedAt) return;
      m.history = [{ id: uid(), date: m.updatedAt || today(), price: m.price, supplier: m.supplier, source: m.priceSource, url: m.url }, ...(m.history || [])].slice(0, 30);
    });

  return (
    <div className="table-wrap">
      <table className="mat-table">
        <thead>
          <tr>
            <th style={{ minWidth: 190 }}>Malzeme</th>
            <th className="num">Çanta başına</th>
            {withWaste && <th className="num">Fire</th>}
            <th className="num">Birim fiyat</th>
            <th style={{ minWidth: 140 }}>Satın alınacak yer</th>
            <th style={{ minWidth: 150 }}>Bağlantı</th>
            <th className="num">MOQ</th>
            <th className="num">Stok</th>
            <th>Son kontrol</th>
            <th className="num">Çanta başı</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const m = state.materials.find((x) => x.id === l.materialId);
            const st = m ? priceStatus(m, state.settings.staleDays) : null;
            const unitCost = m && m.price !== null ? n(l.qty) * (1 + (withWaste ? n(l.waste) : 0) / 100) * n(m.price) : null;
            return (
              <tr key={l.id}>
                <td className="cell-input">
                  <select value={l.materialId} onChange={(e) => setLine(i, 'materialId', e.target.value)}>
                    <option value="">Seçin…</option>
                    {options.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.unit})</option>)}</optgroup>)}
                  </select>
                </td>
                <td className="cell-input" style={{ minWidth: 104 }}><NumberInput value={l.qty} onChange={(v) => setLine(i, 'qty', v)} suffix={unitShort(m?.unit)} /></td>
                {withWaste && <td className="cell-input" style={{ minWidth: 76 }}><NumberInput value={l.waste} onChange={(v) => setLine(i, 'waste', v)} suffix="%" /></td>}
                <td className="cell-input" style={{ minWidth: 112 }}>
                  {m ? <NumberInput value={m.price} allowNull onChange={(v) => setMat(m.id, { price: v }, true)} onBlur={() => commitPriceHistory(m.id)} suffix="₺" /> : '—'}
                </td>
                <td className="cell-input">{m && <TextInput value={m.supplier} onChange={(v) => setMat(m.id, { supplier: v })} placeholder="Satıcı" />}</td>
                <td className="cell-input">
                  {m && (
                    <div className="hstack" style={{ flexWrap: 'nowrap', gap: 4 }}>
                      <input type="url" value={m.url || ''} onChange={(e) => setMat(m.id, { url: e.target.value })} placeholder="https://" />
                      {m.url ? <a className="icon-btn" href={m.url} target="_blank" rel="noreferrer" title="Aç"><ExternalLink size={14} /></a>
                        : <a className="icon-btn" href={searchLinks(m.name)[0].url} target="_blank" rel="noreferrer" title="İnternette ara"><Search size={14} /></a>}
                    </div>
                  )}
                </td>
                <td className="cell-input" style={{ minWidth: 84 }}>{m && <NumberInput value={m.moq} onChange={(v) => setMat(m.id, { moq: v })} />}</td>
                <td className="cell-input" style={{ minWidth: 84 }}>{m && <NumberInput value={m.stockQty} onChange={(v) => setMat(m.id, { stockQty: v })} />}</td>
                <td className="nowrap">
                  {m ? <>{date(m.updatedAt)}<div><Badge tone={st.tone}>{st.label}</Badge></div></> : '—'}
                </td>
                <td className="num"><strong>{unitCost === null ? '—' : money(unitCost)}</strong></td>
                <td><IconButton icon={Trash2} tone="danger" label="Kaldır" onClick={() => patch((c) => { c[listKey].splice(i, 1); })} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StepMaterials() {
  const { state, cfg, patch, result } = useSim();
  return (
    <>
      <StepHead n={4} title="Malzeme ve ham madde seçimi" text="Ortalama bir çantanın reçetesini oluşturun. Fiyatlar malzeme kataloğuyla ortaktır: burada değiştirdiğiniz fiyat, o malzemeyi kullanan bütün çanta modellerinin maliyetini de günceller." />
      <Card title="Çanta reçetesi (kumaş, aksesuar, üretim malzemeleri)"
        actions={
          <div className="hstack">
            {state.products.length > 0 && (
              <Select value="" onChange={(pid) => {
                const p = state.products.find((x) => x.id === pid);
                if (p) patch((c) => { c.recipe = p.bom.filter((l) => l.materialId).map((l) => ({ id: uid(), materialId: l.materialId, qty: l.qty, waste: l.waste })); });
              }} placeholder="Ürün reçetesini kopyala…" options={state.products.map((p) => ({ value: p.id, label: p.name }))} />
            )}
            <Button size="sm" variant="secondary" icon={Plus} onClick={() => patch((c) => { c.recipe.push(newRecipeLine('', state.settings.defaultWaste ?? 10)); })}>Malzeme ekle</Button>
          </div>
        } pad={false}>
        {cfg.recipe.length ? <MaterialTable lines={cfg.recipe} listKey="recipe" categories={['kumas', 'aksesuar', 'uretim']} withWaste /> : <div className="card-body muted small">Henüz malzeme eklenmedi.</div>}
        <div className="card-body">
          <div className="row-line total"><span>Çanta başına malzeme (fire dahil)</span><span>{money(result.materialUnit)}</span></div>
        </div>
      </Card>
      <Card title="Ambalaj ve etiket (çanta başına)" className="mt"
        actions={<Button size="sm" variant="secondary" icon={Plus} onClick={() => patch((c) => { c.packaging.push(newRecipeLine('', 0)); })}>Ekle</Button>} pad={false}>
        {cfg.packaging.length ? <MaterialTable lines={cfg.packaging} listKey="packaging" categories={['ambalaj']} /> : <div className="card-body muted small">Kutu, toz torbası, etiket, kart, kargo poşeti…</div>}
        <div className="card-body">
          <div className="row-line total"><span>Çanta başına ambalaj</span><span>{money(result.packagingUnit)}</span></div>
        </div>
      </Card>
      <Notice tone="info" title="İlk alım nasıl hesaplanır?" >
        İhtiyaç = çanta başına miktar × (1 + fire) × ilk üretim adedi ({result.totalUnits} adet). Elinizdeki stok düşülür; eksik varsa en az minimum sipariş miktarı (MOQ) kadar alım yapılır.
        Fiyatı olmayan malzemeler “Tutar girilmedi” olarak işaretlenir; hiçbir fiyat uydurulmaz.
      </Notice>
    </>
  );
}

/* ---------- 5. Fason ---------- */
export function StepFason() {
  const { cfg, patch, result } = useSim();
  const f = cfg.fason;
  const setF = (k) => (v) => patch((c) => { c.fason[k] = v; });
  const ownUnit = result.materialUnit + n(cfg.production.laborHours) * n(cfg.production.hourlyRate) + result.packagingUnit;
  const label = cfg.model === 'firma' ? 'Üretim firması' : 'Atölye';
  return (
    <>
      <StepHead n={5} title="Dışarıda üretim yaptırma" text={`${label} teklifini girin. 20–500 adet senaryoları otomatik karşılaştırılır.`} />
      <div className="grid g2">
        <Card title={`${label} teklifi`}>
          <div className="form-grid cols-2">
            <Field label={`${label} adı`} wide><TextInput value={f.workshop} onChange={setF('workshop')} /></Field>
            <Field label="Numune üretim ücreti" hint="Tek seferlik · başlangıç yatırımı"><NumberInput value={f.sampleFee} onChange={setF('sampleFee')} suffix="₺" /></Field>
            <Field label="Kalıp ve model hazırlama" hint="Tek seferlik · başlangıç yatırımı"><NumberInput value={f.patternFee} onChange={setF('patternFee')} suffix="₺" /></Field>
            <Field label="Birim dikim ücreti"><NumberInput value={f.unitSewing} onChange={setF('unitSewing')} suffix="₺" /></Field>
            <Field label="Kalite kontrol (adet)"><NumberInput value={f.qcPerUnit} onChange={setF('qcPerUnit')} suffix="₺" /></Field>
            <Field label="Paketleme hizmeti (adet)" hint="Atölyenin paketleme ücreti"><NumberInput value={f.packagingPerUnit} onChange={setF('packagingPerUnit')} suffix="₺" /></Field>
            <Field label="Nakliye (sipariş başına)"><NumberInput value={f.shippingTotal} onChange={setF('shippingTotal')} suffix="₺" /></Field>
            <Field label="Minimum sipariş adedi"><NumberInput value={f.moq} onChange={setF('moq')} suffix="adet" /></Field>
            <Field label="Termin süresi"><NumberInput value={f.leadDays} onChange={setF('leadDays')} suffix="gün" /></Field>
            <Field label="Malzemeyi kim sağlayacak?" wide>
              <div className="seg">
                <button className={f.materialsBy === 'ben' ? 'active' : ''} onClick={() => setF('materialsBy')('ben')}>Ben sağlayacağım</button>
                <button className={f.materialsBy === 'atolye' ? 'active' : ''} onClick={() => setF('materialsBy')('atolye')}>{label} sağlayacak (dikim fiyatına dahil)</button>
              </div>
            </Field>
            <Field label="Ambalaj malzemesi" wide><Toggle checked={f.packagingByWorkshop} onChange={setF('packagingByWorkshop')} label={`Ambalaj malzemesini ${label.toLowerCase()} sağlıyor (benim ambalaj listem bu kısım için sayılmaz)`} /></Field>
            <Field label="Toplam üretim adedi" wide hint="Üretim ve satış hedefi adımından gelir (model × model başına adet)">
              <div className="kpi-box" style={{ padding: '9px 12px' }}><strong>{result.outUnits} adet</strong>{cfg.model === 'hibrit' && <span className="tiny muted"> · toplamın %{100 - n(cfg.hybridOwnPct)}’i</span>}</div>
            </Field>
            <Field label="Tutarlar" wide><label className="est-chip"><input type="checkbox" checked={f.est} onChange={(e) => setF('est')(e.target.checked)} /> Teklif henüz kesin değil (tahmini)</label></Field>
          </div>
          {result.fu?.belowMoq && <Notice tone="danger">Üretim adedi minimum sipariş miktarının altında; atölye bu adedi kabul etmeyebilir.</Notice>}
        </Card>
        <Card title="Adet senaryoları" subtitle="Birim maliyet = dikim + KK + paketleme + nakliye payı (+ malzeme). Numune/kalıp payı ayrıca gösterilir." pad={false}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Adet</th><th className="num">Birim</th><th className="num">+ numune/kalıp payı</th><th className="num">Sipariş toplamı</th>{hasOwn(cfg) || n(cfg.production.hourlyRate) ? <th className="num">Kendim birim</th> : null}</tr></thead>
              <tbody>
                {[20, 50, 100, 250, 500].map((q) => {
                  const u = fasonUnit(cfg, result.materialUnit, result.packagingUnit, q);
                  return (
                    <tr key={q}>
                      <td><strong>{q}</strong>{u.belowMoq && <div><Badge tone="danger">MOQ altı</Badge></div>}</td>
                      <td className="num"><strong>{money(u.unit)}</strong></td>
                      <td className="num muted">{money(u.unitWithSetup)}</td>
                      <td className="num">{money0(u.total)}</td>
                      {hasOwn(cfg) || n(cfg.production.hourlyRate) ? <td className="num">{money(ownUnit)}</td> : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card-body tiny muted">Sipariş toplamı numune ve kalıp dahil, malzeme {f.materialsBy === 'ben' ? 'dahil (sizin alımınız)' : 'dikim fiyatına dahil'}.</div>
        </Card>
      </div>
    </>
  );
}

/* ---------- 6. Marka ve satış ---------- */
export function StepBrand() {
  const { cfg, patch, result } = useSim();
  const b = cfg.brand;
  const setB = (k) => (v) => patch((c) => { c.brand[k] = v; });
  const CH = [
    { key: 'web', label: 'Kendi internet sitem', icon: Globe },
    { key: 'pazaryeri', label: 'Pazaryeri', icon: ShoppingBag },
    { key: 'sosyal', label: 'Sosyal medya', icon: Instagram },
  ];
  return (
    <>
      <StepHead n={6} title="Marka ve satış altyapısı" text="Satış kanallarınızı seçin; kanala bağlı giderler otomatik açılır veya kapanır." />
      <Card title="Satış kanalları ve satış payları">
        <div className="choice-grid three">
          {CH.map((c) => (
            <div key={c.key} className={`choice ${b.channels[c.key] ? 'active' : ''}`} onClick={() => patch((x) => { x.brand.channels[c.key] = !x.brand.channels[c.key]; })} role="button" tabIndex={0}>
              <span className="choice-icon"><c.icon size={20} strokeWidth={1.6} /></span>
              <span className="choice-title">{c.label}</span>
              {b.channels[c.key] && (
                <span onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}>
                  <NumberInput value={b.share[c.key]} onChange={(v) => patch((x) => { x.brand.share[c.key] = v; })} suffix="% satış" />
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>
      <div className="grid g2 mt">
        <Card title="Marka ve web giderleri">
          {BRAND_ITEMS.map((d) => (
            <ItemRow key={d.key} def={d} v={b.items[d.key]} applies={d.applies ? d.applies(cfg) : true} onChange={(p) => patch((c) => { Object.assign(c.brand.items[d.key], p); })} />
          ))}
        </Card>
        <Card title="Satış başına değişken giderler" subtitle="Her satışta oluşur; aylık sabit giderlere eklenmez">
          <div className="form-grid cols-2">
            <Field label="Kargo (sipariş başı)" hint="Kargo anlaşmanızdaki fiyat"><NumberInput value={b.shippingPerOrder} onChange={setB('shippingPerOrder')} suffix="₺" disabled={b.shippingByCustomer} /></Field>
            <Field label="Kargo ücreti"><Toggle checked={b.shippingByCustomer} onChange={setB('shippingByCustomer')} label="Müşteri öder" /></Field>
            {b.channels.pazaryeri && <Field label="Pazaryeri komisyonu" hint="Kategori komisyonu + hizmet bedeli"><NumberInput value={b.mpPct} onChange={setB('mpPct')} suffix="%" /></Field>}
            {b.channels.web && <Field label="Ödeme altyapısı komisyonu (web)"><NumberInput value={b.payPct} onChange={setB('payPct')} suffix="%" /></Field>}
            {b.channels.sosyal && <Field label="Sosyal medya ödeme komisyonu" hint="Ödeme linki vb.; havale ise 0"><NumberInput value={b.socialPayPct} onChange={setB('socialPayPct')} suffix="%" /></Field>}
          </div>
          <div className="row-line strong mt"><span>Ağırlıklı komisyon oranı</span><span>%{number(result.unit.commPct * 100)}</span></div>
          <p className="tiny muted">Komisyon oranları pazaryerine ve kategoriye göre değişir; güncel oranları satıcı panelinden kontrol edin.</p>
        </Card>
      </div>
    </>
  );
}

/* ---------- 7. Pazarlama ---------- */
export function StepMarketing() {
  const { cfg, patch, result } = useSim();
  const monthly = result.monthlyGroups.find((g) => g.key === 'reklam').total;
  const photo = BRAND_ITEMS.find((d) => d.key === 'urun_foto');
  return (
    <>
      <StepHead n={7} title="Pazarlama ve reklam" text="Aylık reklam bütçenizi kalemler halinde belirleyin. Hiçbiri zorunlu değildir." />
      <div className="grid g-2-1">
        <Card title="Pazarlama kalemleri">
          {MARKETING_ITEMS.map((d) => (
            <ItemRow key={d.key} def={d} v={cfg.marketing.items[d.key]} onChange={(p) => patch((c) => { Object.assign(c.marketing.items[d.key], p); })} />
          ))}
          <ItemRow def={{ ...photo, reason: 'Marka adımındaki kalemle aynıdır; tek kez sayılır.' }} v={cfg.brand.items.urun_foto} onChange={(p) => patch((c) => { Object.assign(c.brand.items.urun_foto, p); })} />
        </Card>
        <div className="stack">
          <div className="stat feature"><div className="stat-label">Aylık reklam bütçesi</div><div className="stat-value">{money0(monthly)}</div><div className="stat-hint">Seçili aylık kalemlerin toplamı</div></div>
          <Notice tone="info">Reklam aylık sabit gider olarak sayılır; ürün başına ayrıca eklenmez. Böylece aynı gider iki kez hesaplanmaz.</Notice>
        </div>
      </div>
    </>
  );
}

/* ---------- 8. Çalışma alanı ---------- */
export function StepWorkspace() {
  const { cfg, patch } = useSim();
  const type = cfg.workspace.type;
  const ICON = { ev: Home, atolye: Store, ortak: Users };
  return (
    <>
      <StepHead n={8} title="Çalışma alanı ve aylık giderler" text="Seçiminize göre ilgili giderler listelenir. Evden çalışmada kira eklenmez." />
      <div className="choice-grid three">
        {WORKSPACES.map((w) => <ChoiceCard key={w.id} icon={ICON[w.id]} active={type === w.id} title={w.label} desc={w.desc} onClick={() => patch((c) => { c.workspace.type = w.id; })} />)}
      </div>
      <Card title={WORKSPACES.find((w) => w.id === type).label} className="mt">
        {WORKSPACE_ITEMS[type].map((d) => (
          <ItemRow key={d.key} def={d} v={cfg.workspace.items[type][d.key]} onChange={(p) => patch((c) => { Object.assign(c.workspace.items[type][d.key], p); })} />
        ))}
      </Card>
    </>
  );
}

/* ---------- 9. Hedef ---------- */
export function StepTarget() {
  const { cfg, patch, result } = useSim();
  const t = cfg.target;
  const setT = (k) => (v) => patch((c) => { c.target[k] = v; });
  return (
    <>
      <StepHead n={9} title="Üretim ve satış hedefi" />
      <div className="grid g2">
        <Card title="İlk koleksiyon ve satış">
          <div className="form-grid cols-2">
            <Field label="İlk koleksiyondaki model sayısı"><NumberInput value={t.models} onChange={setT('models')} suffix="model" /></Field>
            <Field label="Her modelden üretilecek adet"><NumberInput value={t.perModel} onChange={setT('perModel')} suffix="adet" /></Field>
            <Field label="Aylık satış hedefi"><NumberInput value={t.monthlySales} onChange={setT('monthlySales')} suffix="adet/ay" /></Field>
            <Field label="Ortalama satış fiyatı (KDV dahil)"><NumberInput value={t.avgPrice} onChange={setT('avgPrice')} suffix="₺" /></Field>
            <Field label="İlk üretim için ayrılan bütçe"><NumberInput value={t.budget} onChange={setT('budget')} suffix="₺" /></Field>
            <Field label="İlk üretim adedi"><div className="kpi-box" style={{ padding: '9px 12px' }}><strong>{result.totalUnits} çanta</strong></div></Field>
          </div>
        </Card>
        <Card title="Finansal varsayımlar" subtitle="Tümü değiştirilebilir">
          <div className="form-grid cols-2">
            <Field label="İlk satışa kadar geçecek süre"><NumberInput value={t.monthsToFirstSale} onChange={setT('monthsToFirstSale')} suffix="ay" /></Field>
            <Field label="Güvenlik rezervi" hint="Sabit giderleri karşılayacak ek süre"><NumberInput value={t.reserveMonths} onChange={setT('reserveMonths')} suffix="ay" /></Field>
            <Field label="Hedef net kâr marjı" hint="Önerilen fiyat için"><NumberInput value={t.targetMargin} onChange={setT('targetMargin')} suffix="%" /></Field>
            <Field label="İade ve fire payı" hint="Net satışın yüzdesi"><NumberInput value={t.returnPct} onChange={setT('returnPct')} suffix="%" /></Field>
            <Field label="KDV oranı"><NumberInput value={t.kdv} onChange={setT('kdv')} suffix="%" /></Field>
            <Field label={cfg.company.type === 'sahis' ? 'Gelir vergisi için ayrılacak oran' : 'Kurumlar vergisi (parametreden)'} hint={cfg.company.type === 'sahis' ? 'Artan oranlı tarife; ortalama tahmini oran' : 'Mevzuat parametrelerinden'}>
              {cfg.company.type === 'sahis' ? <NumberInput value={t.taxPct} onChange={setT('taxPct')} suffix="%" /> : <div className="kpi-box" style={{ padding: '9px 12px' }}><strong>%{number(result.fin.taxRate)}</strong></div>}
            </Field>
            <Field label="Diğer değişken gider (adet)"><NumberInput value={t.otherVarPerUnit} onChange={setT('otherVarPerUnit')} suffix="₺" /></Field>
            <Field label="Diğer başlangıç giderleri"><NumberInput value={t.otherStartup} onChange={setT('otherStartup')} suffix="₺" /></Field>
          </div>
        </Card>
      </div>
      {n(t.budget) > 0 && (
        <Notice tone={result.fin.firstProductionCost > n(t.budget) ? 'danger' : 'brand'} title="İlk üretim bütçesi kontrolü">
          İlk üretim maliyeti (malzeme, ambalaj, numune/kalıp, fason sipariş): {money(result.fin.firstProductionCost)} · Ayrılan bütçe: {money(t.budget)} ·
          {' '}{result.fin.firstProductionCost > n(t.budget) ? `Eksik: ${money(result.fin.firstProductionCost - n(t.budget))}` : `Kalan: ${money(n(t.budget) - result.fin.firstProductionCost)}`}
        </Notice>
      )}
    </>
  );
}

export { SrcBadge, Copy };
