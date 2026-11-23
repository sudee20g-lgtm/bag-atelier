import { useState } from 'react';
import { Plus, Trash2, Pencil, Wallet, CheckCircle2, CalendarClock, Repeat } from 'lucide-react';
import { useStore } from '../store.jsx';
import { money, money0, date, today, uid, n, daysBetween } from '../lib/format.js';
import { PageHeader, Card, Button, IconButton, Field, TextInput, NumberInput, Select, Modal, Tabs, Empty, Badge, Stat, confirmDelete } from '../ui.jsx';
import { LEDGER_CATS } from './Dashboard.jsx';

const catOptions = Object.entries(LEDGER_CATS).map(([value, label]) => ({ value, label }));

function TxEditor({ initial, onClose }) {
  const { upsert } = useStore();
  const [t, setT] = useState(initial);
  const set = (k) => (v) => setT((x) => ({ ...x, [k]: v }));
  return (
    <Modal open title={initial.description ? 'Harcamayı düzenle' : 'Yeni harcama'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={() => { if (!t.description || !n(t.amount)) return alert('Açıklama ve tutar zorunludur.'); upsert('ledger', t); onClose(); }}>Kaydet</Button></>}>
      <div className="form-grid cols-2">
        <Field label="Tarih"><input type="date" value={t.date} onChange={(e) => set('date')(e.target.value)} /></Field>
        <Field label="Kategori"><Select value={t.category} onChange={set('category')} options={catOptions} /></Field>
        <Field label="Açıklama" wide><TextInput value={t.description} onChange={set('description')} placeholder="ör. 10 m PU deri" /></Field>
        <Field label="Tutar (KDV dahil ödenen)"><NumberInput value={t.amount} onChange={set('amount')} suffix="₺" /></Field>
        <Field label="Satıcı / alıcı"><TextInput value={t.supplier} onChange={set('supplier')} /></Field>
        <Field label="Not" wide><TextInput value={t.note} onChange={set('note')} /></Field>
      </div>
    </Modal>
  );
}

function PaymentEditor({ initial, onClose }) {
  const { upsert } = useStore();
  const [p, setP] = useState(initial);
  const set = (k) => (v) => setP((x) => ({ ...x, [k]: v }));
  return (
    <Modal open title={initial.title ? 'Ödemeyi düzenle' : 'Yeni ödeme'} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button onClick={() => { if (!p.title || !p.dueDate) return alert('Başlık ve tarih zorunludur.'); upsert('payments', p); onClose(); }}>Kaydet</Button></>}>
      <div className="form-grid cols-2">
        <Field label="Başlık" wide><TextInput value={p.title} onChange={set('title')} placeholder="ör. Bağ-Kur primi – Aralık" /></Field>
        <Field label="Son ödeme tarihi"><input type="date" value={p.dueDate} onChange={(e) => set('dueDate')(e.target.value)} /></Field>
        <Field label="Tutar"><NumberInput value={p.amount} onChange={set('amount')} suffix="₺" /></Field>
        <Field label="Kategori"><Select value={p.category} onChange={set('category')} options={catOptions} /></Field>
        <Field label="Tekrar"><Select value={p.repeat} onChange={set('repeat')} options={[{ value: '', label: 'Tek sefer' }, { value: 'aylik', label: 'Her ay' }, { value: 'yillik', label: 'Her yıl' }]} /></Field>
        <Field label="Not" wide><TextInput value={p.note} onChange={set('note')} /></Field>
      </div>
    </Modal>
  );
}

const addPeriod = (iso, repeat) => {
  const d = new Date(iso + 'T00:00:00');
  if (repeat === 'aylik') d.setMonth(d.getMonth() + 1);
  if (repeat === 'yillik') d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function Ledger() {
  const { state, update, remove } = useStore();
  const [tab, setTab] = useState('odemeler');
  const [tx, setTx] = useState(null);
  const [pay, setPay] = useState(null);
  const [catFilter, setCatFilter] = useState('');

  const spent = state.ledger.reduce((a, t) => a + n(t.amount), 0);
  const pending = state.payments.filter((p) => !p.paid);
  const late = pending.filter((p) => daysBetween(today(), p.dueDate) < 0);
  const ledger = [...state.ledger].filter((t) => !catFilter || t.category === catFilter).sort((a, b) => b.date.localeCompare(a.date));
  const payments = [...state.payments].sort((a, b) => (a.paid - b.paid) || a.dueDate.localeCompare(b.dueDate));

  const markPaid = (p) =>
    update((d) => {
      const x = d.payments.find((y) => y.id === p.id);
      x.paid = true;
      x.paidAt = today();
      d.ledger.push({ id: uid(), date: today(), category: p.category, description: p.title, amount: n(p.amount), supplier: '', note: 'Ödeme takviminden' });
      if (p.repeat) {
        d.payments.push({ ...p, id: uid(), paid: false, paidAt: '', dueDate: addPeriod(p.dueDate, p.repeat) });
      }
    });

  return (
    <>
      <PageHeader
        eyebrow="Finans"
        title="Harcamalar ve Ödeme Takvimi"
        subtitle="Gerçekleşen her harcama sermayeden düşülür. Ödendi olarak işaretlenen ödemeler otomatik harcamaya dönüşür."
        actions={
          <>
            <Button variant="secondary" icon={CalendarClock} onClick={() => setPay({ id: uid(), title: '', dueDate: today(), amount: 0, category: 'isletme', repeat: '', paid: false, note: '' })}>Ödeme planla</Button>
            <Button icon={Plus} onClick={() => setTx({ id: uid(), date: today(), category: 'malzeme', description: '', amount: 0, supplier: '', note: '' })}>Harcama ekle</Button>
          </>
        }
      />
      <div className="stats mb">
        <Stat tone="feature" label="Toplam harcanan" value={money0(spent)} icon={Wallet} />
        <Stat tone="pink" label="Kalan bütçe" value={money0(n(state.settings.capital) - spent)} hint="Başlangıç sermayesi − harcanan" />
        <Stat label="Bekleyen ödemeler" value={money0(pending.reduce((a, p) => a + n(p.amount), 0))} hint={`${pending.length} ödeme`} />
        <Stat tone={late.length ? 'neg' : ''} label="Geciken" value={late.length} hint={late.length ? money0(late.reduce((a, p) => a + n(p.amount), 0)) : 'Gecikme yok'} />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'odemeler', label: 'Ödeme takvimi', count: pending.length },
        { value: 'harcamalar', label: 'Harcamalar', count: state.ledger.length },
      ]} />

      {tab === 'odemeler' && (
        <Card pad={false}>
          {payments.length === 0 ? <Empty icon={CalendarClock} title="Planlanmış ödeme yok" text="Kira, Bağ-Kur, mali müşavir, tedarikçi ödemelerini ekleyin; tekrarlayanlar otomatik yenilenir." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Son tarih</th><th>Ödeme</th><th>Kategori</th><th className="num">Tutar</th><th>Durum</th><th /></tr></thead>
                <tbody>
                  {payments.map((p) => {
                    const days = daysBetween(today(), p.dueDate);
                    return (
                      <tr key={p.id} style={{ opacity: p.paid ? 0.55 : 1 }}>
                        <td className="nowrap">{date(p.dueDate)}</td>
                        <td><strong>{p.title}</strong> {p.repeat && <Badge tone="info"><Repeat size={11} />{p.repeat === 'aylik' ? 'Aylık' : 'Yıllık'}</Badge>}{p.note && <div className="tiny muted">{p.note}</div>}</td>
                        <td>{LEDGER_CATS[p.category]}</td>
                        <td className="num"><strong>{money(p.amount)}</strong></td>
                        <td>
                          {p.paid ? <Badge tone="ok">Ödendi · {date(p.paidAt)}</Badge>
                            : days < 0 ? <Badge tone="danger">{-days} gün gecikti</Badge>
                            : days <= 7 ? <Badge tone="warn">{days === 0 ? 'Bugün' : `${days} gün kaldı`}</Badge>
                            : <Badge>{days} gün kaldı</Badge>}
                        </td>
                        <td><div className="row-actions">
                          {!p.paid && <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => markPaid(p)}>Ödendi</Button>}
                          <IconButton icon={Pencil} label="Düzenle" onClick={() => setPay(structuredClone(p))} />
                          <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete('Ödeme') && remove('payments', p.id)} />
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'harcamalar' && (
        <Card pad={false} title=" " actions={<div style={{ width: 200 }}><Select value={catFilter} onChange={setCatFilter} placeholder="Tüm kategoriler" options={catOptions} /></div>}>
          {ledger.length === 0 ? <Empty icon={Wallet} title="Harcama kaydı yok" /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tarih</th><th>Açıklama</th><th>Kategori</th><th>Satıcı</th><th className="num">Tutar</th><th /></tr></thead>
                <tbody>
                  {ledger.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap">{date(t.date)}</td>
                      <td><strong>{t.description}</strong>{t.note && <div className="tiny muted">{t.note}</div>}</td>
                      <td><Badge tone="brand">{LEDGER_CATS[t.category] || t.category}</Badge></td>
                      <td>{t.supplier || '—'}</td>
                      <td className="num"><strong>{money(t.amount)}</strong></td>
                      <td><div className="row-actions">
                        <IconButton icon={Pencil} label="Düzenle" onClick={() => setTx(structuredClone(t))} />
                        <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete('Harcama') && remove('ledger', t.id)} />
                      </div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>Toplam</td><td className="num">{money(ledger.reduce((a, t) => a + n(t.amount), 0))}</td><td /></tr></tfoot>
              </table>
            </div>
          )}
        </Card>
      )}
      {tx && <TxEditor initial={tx} onClose={() => setTx(null)} />}
      {pay && <PaymentEditor initial={pay} onClose={() => setPay(null)} />}
    </>
  );
}
