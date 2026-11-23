import { useMemo, useState } from 'react';
import { Info, HelpCircle } from 'lucide-react';
import { useStore } from '../../store.jsx';
import { computeSim, normalizeConfig, KIND, SRC, FREQ } from '../../lib/simulator.js';
import { money } from '../../lib/format.js';
import { Badge, NumberInput } from '../../ui.jsx';

export function useSim() {
  const { state, update } = useStore();
  const sim = state.sim;
  const cfg = useMemo(() => normalizeConfig(sim.scenarios[sim.active] || sim.scenarios.dengeli), [sim]);
  const result = useMemo(() => computeSim(state, cfg), [state, cfg]);
  /** patch(c => { c.company.type = 'limited' }) */
  const patch = (fn) =>
    update((d) => {
      const key = d.sim.active;
      const c = normalizeConfig(d.sim.scenarios[key] || d.sim.scenarios.dengeli);
      fn(c);
      d.sim.scenarios[key] = c;
    });
  return { state, sim, cfg, result, patch, update };
}

export const KindBadge = ({ kind }) => <Badge tone={KIND[kind].tone}>{KIND[kind].label}</Badge>;
export const SrcBadge = ({ src }) => <Badge tone={SRC[src].tone}>{SRC[src].label}</Badge>;

export function StepHead({ n, title, text }) {
  return (
    <div className="step-head">
      <span className="step-num">{n}</span>
      <div>
        <h2>{title}</h2>
        {text && <p className="muted small">{text}</p>}
      </div>
    </div>
  );
}

const SUFFIX = { once: '₺', monthly: '₺/ay', yearly: '₺/yıl', perUnit: '₺/adet' };

/**
 * Gider kalemi satırı.
 * def: kalem tanımı; v: { selected, amount, est }; onChange(patch)
 * applies: koşullu kalemin durumunuza uyup uymadığı
 */
export function ItemRow({ def, v, onChange, applies = true, auto, autoNote }) {
  const [open, setOpen] = useState(false);
  const optional = def.kind === 'istege';
  const active = def.kind === 'zorunlu' || (def.kind === 'kosullu' ? applies : !!v?.selected);
  return (
    <div className={`item-row ${active ? '' : 'inactive'}`}>
      <div className="item-main">
        {optional ? (
          <input type="checkbox" className="item-check" checked={!!v?.selected} onChange={(e) => onChange({ selected: e.target.checked })} aria-label={def.label} />
        ) : (
          <span className={`item-dot ${def.kind}`} />
        )}
        <div className="item-text">
          <div className="item-label">
            {def.label}
            {def.reason && (
              <button type="button" className="info-btn" onClick={() => setOpen((x) => !x)} aria-label="Açıklama">
                {def.kind === 'zorunlu' ? <Info size={14} /> : <HelpCircle size={14} />}
              </button>
            )}
          </div>
          <div className="item-meta">
            <KindBadge kind={def.kind} />
            <span className="tiny muted">{FREQ[def.freq]}</span>
            {def.kind === 'kosullu' && def.cond && <span className="tiny muted">· {def.cond}{applies ? '' : ' — durumunuzda gerekmiyor'}</span>}
          </div>
        </div>
        <div className="item-amount">
          {auto !== undefined ? (
            <strong className="mono">{money(auto)}</strong>
          ) : (
            <>
              <NumberInput value={v?.amount ?? 0} onChange={(x) => onChange({ amount: x, ...(optional && x > 0 && !v?.selected ? { selected: true } : {}) })} suffix={SUFFIX[def.freq]} disabled={!active && def.kind === 'kosullu'} />
              <label className="est-chip" title="Tutarı tahmini olarak işaretle">
                <input type="checkbox" checked={!!v?.est} onChange={(e) => onChange({ est: e.target.checked })} />
                tahmini
              </label>
            </>
          )}
        </div>
      </div>
      {open && def.reason && (
        <div className={`item-reason ${def.kind}`}>
          <strong>{def.kind === 'zorunlu' ? 'Neden zorunlu? ' : def.kind === 'kosullu' ? 'Ne zaman gerekir? ' : 'Not: '}</strong>
          {def.reason}
        </div>
      )}
      {autoNote && <div className="item-reason kosullu">{autoNote}</div>}
    </div>
  );
}

export function ChoiceCard({ active, title, desc, onClick, icon: Icon }) {
  return (
    <button type="button" className={`choice ${active ? 'active' : ''}`} onClick={onClick}>
      {Icon && <span className="choice-icon"><Icon size={20} strokeWidth={1.6} /></span>}
      <span className="choice-title">{title}</span>
      {desc && <span className="choice-desc">{desc}</span>}
    </button>
  );
}

export function KindLegend() {
  return (
    <div className="kind-legend">
      <span><span className="item-dot zorunlu" /> <b>Zorunlu</b> — seçim gerekmeden eklenir</span>
      <span><span className="item-dot kosullu" /> <b>Koşula bağlı</b> — durumunuza göre eklenir</span>
      <span><input type="checkbox" checked readOnly className="item-check" style={{ pointerEvents: 'none' }} /> <b>İsteğe bağlı</b> — yalnızca seçerseniz eklenir</span>
    </div>
  );
}
