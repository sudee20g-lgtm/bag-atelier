import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calculator, Save, FolderOpen, FilePlus2, Trash2, Check } from 'lucide-react';
import { useStore } from '../store.jsx';
import { defaultSim, hasOwn, hasOut, SCENARIOS, normalizeConfig } from '../lib/simulator.js';
import { money0, money, date, uid, today } from '../lib/format.js';
import { PageHeader, Button, IconButton, Modal, TextInput, Empty, Badge, Tabs, confirmDelete } from '../ui.jsx';
import { useSim } from './sim/common.jsx';
import { StepModel, StepCompany, StepProduction, StepMaterials, StepFason, StepBrand, StepMarketing, StepWorkspace, StepTarget } from './sim/Steps.jsx';
import { ResultView, ScenarioCompare, ExportBar } from './sim/Results.jsx';

const ALL_STEPS = [
  { id: 'model', label: 'İş modeli', el: StepModel },
  { id: 'sirket', label: 'Şirket & resmî', el: StepCompany },
  { id: 'uretim', label: 'Makine & ekipman', el: StepProduction, when: hasOwn },
  { id: 'malzeme', label: 'Malzemeler', el: StepMaterials },
  { id: 'fason', label: 'Fason üretim', el: StepFason, when: hasOut },
  { id: 'marka', label: 'Marka & satış', el: StepBrand },
  { id: 'pazarlama', label: 'Pazarlama', el: StepMarketing },
  { id: 'alan', label: 'Çalışma alanı', el: StepWorkspace },
  { id: 'hedef', label: 'Hedefler', el: StepTarget },
  { id: 'sonuc', label: 'Sonuç', el: null },
];

function SavesModal({ onClose }) {
  const { state, update } = useStore();
  return (
    <Modal open title="Kayıtlı simülasyonlar" onClose={onClose} footer={<Button onClick={onClose}>Kapat</Button>}>
      {state.simSaves.length === 0 ? (
        <Empty icon={FolderOpen} title="Kayıt yok" text="Bir simülasyonu “Kaydet” ile saklayın; daha sonra buradan açabilirsiniz." />
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {[...state.simSaves].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map((s) => (
            <div key={s.id} className="save-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>{s.name} {state.sim.savedId === s.id && <Badge tone="brand">Açık</Badge>}</div>
                <div className="tiny muted">{date(s.savedAt.slice(0, 10))} · {Object.values(s.sim.scenarios).filter(Boolean).length} senaryo</div>
              </div>
              <Button size="sm" variant="secondary" icon={FolderOpen} onClick={() => {
                update((d) => { d.sim = { ...structuredClone(s.sim), savedId: s.id, name: s.name }; });
                onClose();
              }}>Aç</Button>
              <IconButton icon={Trash2} tone="danger" label="Sil" onClick={() => confirmDelete(`“${s.name}”`) && update((d) => { d.simSaves = d.simSaves.filter((x) => x.id !== s.id); })} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export default function Simulator() {
  const { sim, cfg, result, update } = useSim();
  const { state } = useStore();
  const steps = ALL_STEPS.filter((s) => !s.when || s.when(cfg));
  const [stepId, setStepId] = useState('model');
  const [resultTab, setResultTab] = useState('sonuc');
  const [saves, setSaves] = useState(false);
  const [flash, setFlash] = useState('');
  const idx = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[idx];
  const goStep = (id) => { setStepId(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const save = (asNew) => {
    const id = !asNew && sim.savedId ? sim.savedId : uid();
    const name = asNew ? window.prompt('Simülasyon adı', `${sim.name} (kopya)`) : sim.name;
    if (!name) return;
    update((d) => {
      const entry = { id, name, savedAt: new Date().toISOString(), sim: { ...structuredClone(d.sim), savedId: id, name } };
      const i = d.simSaves.findIndex((x) => x.id === id);
      if (i >= 0) d.simSaves[i] = entry;
      else d.simSaves.push(entry);
      d.sim.savedId = id;
      d.sim.name = name;
    });
    setFlash('Kaydedildi');
    setTimeout(() => setFlash(''), 1800);
  };

  const savedEntry = state.simSaves.find((s) => s.id === sim.savedId);
  const dirty = !savedEntry || JSON.stringify({ ...savedEntry.sim, savedId: '', name: '' }) !== JSON.stringify({ ...sim, savedId: '', name: '' });
  const r = result;

  return (
    <>
      <PageHeader
        eyebrow="İş Kurma ve Maliyet Simülatörü"
        title="Kendi çanta markanı kurmadan önce bütün maliyetlerini hesapla"
        subtitle="Adım adım seçim yapın: zorunlu giderler otomatik eklenir, koşula bağlı giderler durumunuza göre değişir, isteğe bağlı giderler yalnızca siz seçerseniz hesaba girer."
        actions={
          <>
            <Button variant="ghost" icon={FilePlus2} onClick={() => {
              if (dirty && !window.confirm('Kaydedilmemiş değişiklikler var. Yeni simülasyon başlatılsın mı?')) return;
              update((d) => { d.sim = defaultSim(); });
              setStepId('model');
            }}>Yeni</Button>
            <Button variant="secondary" icon={FolderOpen} onClick={() => setSaves(true)}>Kayıtlar · {state.simSaves.length}</Button>
            <Button icon={flash ? Check : Save} onClick={() => save(false)}>{flash || (sim.savedId ? (dirty ? 'Kaydet*' : 'Kaydedildi') : 'Kaydet')}</Button>
          </>
        }
      />

      <div className="sim-toolbar no-print">
        <div className="hstack" style={{ flex: 1, minWidth: 220 }}>
          <span className="tiny muted" style={{ fontWeight: 700 }}>Ad</span>
          <div style={{ flex: 1, maxWidth: 320 }}><TextInput value={sim.name} onChange={(v) => update((d) => { d.sim.name = v; })} /></div>
          {sim.savedId && <Button size="sm" variant="ghost" onClick={() => save(true)}>Farklı kaydet</Button>}
        </div>
        <div className="chips">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={`chip ${sim.active === s.id ? 'active' : ''}`} disabled={!sim.scenarios[s.id]}
              title={sim.scenarios[s.id] ? s.desc : 'Sonuç › Senaryo karşılaştırması bölümünden oluşturun'}
              onClick={() => update((d) => { d.sim.active = s.id; })}>
              {s.label}{!sim.scenarios[s.id] && ' · yok'}
            </button>
          ))}
        </div>
      </div>

      {/* Canlı toplam çubuğu */}
      <div className="live-bar no-print">
        <div><span>Başlangıç yatırımı</span><b>{money0(r.startupTotal)}</b></div>
        <div><span>Aylık sabit gider</span><b>{money0(r.monthlyFixed)}</b></div>
        <div><span>Çanta başı maliyet</span><b>{money(r.fin.unitTotal)}</b></div>
        <div className="accent"><span>Toplam sermaye ihtiyacı</span><b>{money0(r.fin.capitalNeed)}</b></div>
        {r.missingAmounts > 0 && <div className="warnbox"><span>Tutarı eksik</span><b>{r.missingAmounts} kalem</b></div>}
      </div>

      <nav className="stepper no-print" aria-label="Adımlar">
        {steps.map((s, i) => (
          <button key={s.id} className={`step ${s.id === step.id ? 'active' : ''} ${i < idx ? 'done' : ''}`} onClick={() => goStep(s.id)}>
            <span className="dot">{i < idx ? <Check size={12} /> : i + 1}</span>
            <span className="lbl">{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="sim-body">
        {step.id === 'sonuc' ? (
          <>
            <div className="hstack mb no-print" style={{ justifyContent: 'space-between' }}>
              <Tabs value={resultTab} onChange={setResultTab} tabs={[{ value: 'sonuc', label: 'Hesaplama sonucu' }, { value: 'senaryo', label: 'Senaryo karşılaştırması' }]} />
              <ExportBar />
            </div>
            {resultTab === 'sonuc' ? <ResultView /> : <ScenarioCompare onEdit={(id) => { update((d) => { d.sim.active = id; }); setResultTab('sonuc'); goStep('model'); }} />}
          </>
        ) : (
          <step.el />
        )}
      </div>

      <div className="step-nav no-print">
        <Button variant="secondary" icon={ChevronLeft} disabled={idx === 0} onClick={() => goStep(steps[idx - 1].id)}>Geri</Button>
        <span className="tiny muted">Adım {idx + 1} / {steps.length}</span>
        {step.id === 'hedef' ? (
          <button className="calc-btn" onClick={() => { setResultTab('sonuc'); goStep('sonuc'); }}><Calculator size={20} /> HESAPLA</button>
        ) : step.id !== 'sonuc' ? (
          <Button onClick={() => goStep(steps[idx + 1].id)}>İleri <ChevronRight size={16} /></Button>
        ) : (
          <Button variant="secondary" onClick={() => goStep('model')}>Başa dön</Button>
        )}
      </div>
      {saves && <SavesModal onClose={() => setSaves(false)} />}
    </>
  );
}
