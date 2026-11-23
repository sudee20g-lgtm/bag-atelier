import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingBag, Layers, Scissors, Factory, Wrench, PackageCheck, Tags, CalendarClock,
  Wallet, Landmark, Settings as SettingsIcon, Menu, Rocket,
} from 'lucide-react';
import { useStore } from './store.jsx';
import { Notice } from './ui.jsx';
import Dashboard from './modules/Dashboard.jsx';
import Products from './modules/Products.jsx';
import Materials from './modules/Materials.jsx';
import OwnProduction from './modules/OwnProduction.jsx';
import Fason from './modules/Fason.jsx';
import Equipment from './modules/Equipment.jsx';
import Records from './modules/Records.jsx';
import Pricing from './modules/Pricing.jsx';
import Expenses from './modules/Expenses.jsx';
import Ledger from './modules/Ledger.jsx';
import Company from './modules/Company.jsx';
import Settings from './modules/Settings.jsx';
import Simulator from './modules/Simulator.jsx';

export const NAV = [
  { group: 'Genel', items: [
    { id: 'panel', label: 'Yönetim Paneli', icon: LayoutDashboard, el: Dashboard },
    { id: 'simulator', label: 'İş Kurma Simülatörü', icon: Rocket, el: Simulator },
  ] },
  {
    group: 'Tasarım',
    items: [
      { id: 'urunler', label: 'Ürün Kütüphanesi', icon: ShoppingBag, el: Products },
      { id: 'malzemeler', label: 'Malzeme & Tedarikçi', icon: Layers, el: Materials },
    ],
  },
  {
    group: 'Üretim',
    items: [
      { id: 'kendim', label: 'Kendim Üretirsem', icon: Scissors, el: OwnProduction },
      { id: 'fason', label: 'Fason Üretim', icon: Factory, el: Fason },
      { id: 'ekipman', label: 'Atölye & Ekipman', icon: Wrench, el: Equipment },
      { id: 'kayitlar', label: 'Üretim & Satış', icon: PackageCheck, el: Records },
    ],
  },
  {
    group: 'Finans',
    items: [
      { id: 'fiyat', label: 'Fiyatlandırma & Kâr', icon: Tags, el: Pricing },
      { id: 'giderler', label: 'Aylık Giderler', icon: CalendarClock, el: Expenses },
      { id: 'harcamalar', label: 'Harcama & Ödemeler', icon: Wallet, el: Ledger },
    ],
  },
  {
    group: 'Şirket',
    items: [
      { id: 'sirket', label: 'Şirket Kuruluş Merkezi', icon: Landmark, el: Company },
      { id: 'ayarlar', label: 'Ayarlar & Yedek', icon: SettingsIcon, el: Settings },
    ],
  },
];
const ALL = NAV.flatMap((g) => g.items);

const readHash = () => {
  const h = window.location.hash.replace('#/', '').split('?')[0];
  return ALL.some((x) => x.id === h) ? h : 'panel';
};

export const go = (id) => {
  window.location.hash = `#/${id}`;
};

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M8 9V7a4 4 0 0 1 8 0v2" />
      <rect x="4" y="9" width="16" height="11" rx="3" />
      <path d="M10 13h4" />
    </svg>
  );
}

export default function App() {
  const { state, saveError } = useStore();
  const [page, setPage] = useState(readHash);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => {
      setPage(readHash());
      setOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);

  const Current = ALL.find((x) => x.id === page)?.el || Dashboard;

  return (
    <div className="app">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Logo /></div>
          <div>
            <div className="brand-name">{state.settings.brandName || 'Bag Atelier'}</div>
            <div className="brand-sub">Brand Management Studio</div>
          </div>
        </div>
        <nav>
          {NAV.map((g) => (
            <div className="nav-group" key={g.group}>
              <div className="nav-title">{g.group}</div>
              {g.items.map((it) => (
                <button key={it.id} className={`nav-item ${page === it.id ? 'active' : ''}`} onClick={() => go(it.id)}>
                  <it.icon size={18} strokeWidth={1.7} />
                  {it.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          Veriler bu tarayıcıda saklanır. Düzenli olarak <a href="#/ayarlar">yedek alın</a>.
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="topbar-mobile">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Menü"><Menu size={20} /></button>
          <div className="brand-name">{state.settings.brandName || 'Bag Atelier'}</div>
        </div>
        <main className="main">
          <Current />
        </main>
      </div>
      {saveError && <div className="save-error"><Notice tone="danger">{saveError}</Notice></div>}
    </div>
  );
}
