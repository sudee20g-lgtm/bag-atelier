import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { initialState } from './lib/seed.js';

const KEY = 'bag-atelier-v1';
const Ctx = createContext(null);

/** Eski kayıtları güncel veri yapısına taşır (yeni alanlar, yeni katalog malzemeleri) */
export function migrate(saved) {
  const base = initialState();
  const next = {
    ...base,
    ...saved,
    settings: { ...base.settings, ...(saved.settings || {}) },
    insurance: { ...base.insurance, ...(saved.insurance || {}) },
    company: { ...base.company, ...(saved.company || {}) },
    sim: saved.sim || base.sim,
    simSaves: saved.simSaves || [],
  };
  const names = new Set(next.materials.map((m) => m.name));
  base.materials.forEach((m) => { if (!names.has(m.name)) next.materials.push(m); });
  next.materials = next.materials.map((m) => ({ moq: 0, stockQty: 0, ...m }));
  return next;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    return migrate(JSON.parse(raw));
  } catch {
    return initialState();
  }
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);
  const [saveError, setSaveError] = useState('');
  const timer = useRef();

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        setSaveError('');
      } catch (e) {
        setSaveError('Veriler kaydedilemedi: tarayıcı depolama alanı dolu olabilir. Büyük ürün fotoğraflarını küçültün veya yedek alıp silin.');
      }
    }, 300);
  }, [state]);

  /** update(draft => { ...mutate... }) */
  const update = useCallback((fn) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const api = useMemo(
    () => ({
      state,
      update,
      saveError,
      upsert: (coll, item) =>
        update((d) => {
          const i = d[coll].findIndex((x) => x.id === item.id);
          if (i >= 0) d[coll][i] = item;
          else d[coll].push(item);
        }),
      remove: (coll, id) =>
        update((d) => {
          d[coll] = d[coll].filter((x) => x.id !== id);
        }),
      replaceAll: (next) => setState(migrate(next)),
      reset: () => setState(initialState()),
    }),
    [state, update, saveError]
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
