const tl = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2, minimumFractionDigits: 2 });
const tl0 = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export const n = (v) => (typeof v === 'number' && isFinite(v) ? v : Number(v) || 0);
export const money = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : tl.format(v));
export const money0 = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : tl0.format(v));
export const number = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : num.format(v));
export const pct = (v) => (v === null || v === undefined || !isFinite(v) ? '—' : `%${num.format(v)}`);

export const today = () => new Date().toISOString().slice(0, 10);
export const date = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
export const dateLong = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d) ? '—' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};
export const daysBetween = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const monthKey = (iso) => (iso ? iso.slice(0, 7) : '');
export const monthLabel = (key) => {
  const [y, m] = key.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
};
const UNIT_SHORT = { metre: 'm', metrekare: 'm²', adet: 'ad', kilogram: 'kg', gram: 'g', paket: 'pk', top: 'top', makara: 'mkr', litre: 'lt', set: 'set', çift: 'çift' };
export const unitShort = (u) => UNIT_SHORT[u] || (u || '').slice(0, 4);
