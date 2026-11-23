import { useEffect, useState } from 'react';
import { X, Info, AlertTriangle } from 'lucide-react';

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, subtitle, actions, children, className = '', pad = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={pad ? 'card-body' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = '' }) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className="stat-icon">
            <Icon size={16} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Badge({ tone = 'muted', children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Button({ variant = 'primary', icon: Icon, children, size, className = '', ...rest }) {
  return (
    <button className={`btn ${variant} ${size || ''} ${className}`} {...rest}>
      {Icon && <Icon size={16} strokeWidth={1.9} />}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon: Icon, label, tone = '', ...rest }) {
  return (
    <button className={`icon-btn ${tone}`} title={label} aria-label={label} {...rest}>
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}

export function Field({ label, hint, children, wide }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** "1.250,50" | "1250.5" | "12,5" → sayı */
export function parseNum(t) {
  if (t === '' || t === '-' || t === null || t === undefined) return null;
  const s = String(t);
  let norm = s;
  if (s.includes(',')) norm = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) norm = s.replace(/\./g, ''); // TR binlik ayırıcı: 1.500 → 1500
  const v = Number(norm);
  return isNaN(v) ? null : v;
}

/** Sayı girişi: boş bırakılabilir (null) */
export function NumberInput({ value, onChange, allowNull = false, suffix, min, step = 'any', ...rest }) {
  const show = (v) => (v === null || v === undefined || (v === 0 && !allowNull) ? (v === 0 ? '0' : '') : String(v).replace('.', ','));
  const [text, setText] = useState(show(value));
  useEffect(() => {
    const parsed = parseNum(text);
    const current = parsed === null ? (allowNull ? null : 0) : parsed;
    if (current !== (value ?? (allowNull ? null : 0))) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={`input-wrap ${suffix ? 'has-suffix' : ''}`}>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.,-]/g, '');
          setText(t);
          const v = parseNum(t);
          onChange(v === null ? (allowNull ? null : 0) : v);
        }}
        {...rest}
      />
      {suffix && <span className="suffix">{suffix}</span>}
    </div>
  );
}

export function TextInput({ value, onChange, ...rest }) {
  return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
    </select>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track"><span className="thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          <IconButton icon={X} label="Kapat" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" className={`tab ${value === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-icon"><Icon size={26} strokeWidth={1.5} /></div>}
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Notice({ tone = 'info', children, title }) {
  const Icon = tone === 'warn' || tone === 'danger' ? AlertTriangle : Info;
  return (
    <div className={`notice ${tone}`}>
      <Icon size={18} strokeWidth={1.8} />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Row({ label, value, strong, tone, sub }) {
  return (
    <div className={`row-line ${strong ? 'strong' : ''} ${tone || ''} ${sub ? 'sub' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function confirmDelete(what = 'Bu kayıt') {
  return window.confirm(`${what} silinecek. Emin misiniz?`);
}
