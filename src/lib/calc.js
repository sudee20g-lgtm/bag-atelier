import { n, today, daysBetween } from './format.js';

export const param = (state, key) => n(state.params.find((p) => p.key === key)?.value);

/* ---------- Malzeme fiyat durumu ---------- */
export function priceStatus(m, staleDays = 90) {
  if (m.price === null || m.price === undefined || m.price === '') return { key: 'yok', label: 'Fiyat girilmedi', tone: 'muted' };
  if (m.priceSource === 'tahmini') return { key: 'tahmini', label: 'Tahmini – doğrulanmadı', tone: 'warn' };
  if (!m.updatedAt) return { key: 'tarihsiz', label: 'Tarih yok', tone: 'warn' };
  const age = daysBetween(m.updatedAt, today());
  if (age > staleDays) return { key: 'eski', label: `Güncel değil (${age} gün)`, tone: 'danger' };
  if (!m.supplier && !m.url) return { key: 'kaynaksiz', label: 'Kaynak yok', tone: 'warn' };
  return { key: 'guncel', label: 'Güncel', tone: 'ok' };
}

/* ---------- Ürün malzeme (BOM) maliyeti ---------- */
export function bomCost(state, product) {
  const lines = (product.bom || []).map((line) => {
    const m = state.materials.find((x) => x.id === line.materialId);
    const qty = n(line.qty);
    const waste = n(line.waste);
    const effQty = qty * (1 + waste / 100);
    const hasPrice = m && m.price !== null && m.price !== '' && m.price !== undefined;
    const cost = hasPrice ? effQty * n(m.price) : 0;
    return { ...line, material: m, qty, waste, effQty, cost, hasPrice, wasteCost: hasPrice ? (effQty - qty) * n(m.price) : 0 };
  });
  const total = lines.reduce((s, l) => s + l.cost, 0);
  const byCategory = {};
  lines.forEach((l) => {
    const c = l.material?.category || 'diger';
    byCategory[c] = (byCategory[c] || 0) + l.cost;
  });
  return {
    lines,
    total,
    byCategory,
    wasteTotal: lines.reduce((s, l) => s + l.wasteCost, 0),
    missing: lines.filter((l) => !l.hasPrice).length,
  };
}

/* ---------- Ekipman / ilk yatırım ---------- */
export function investment(state) {
  const items = state.equipment.filter((e) => e.status === 'planlandi' || e.status === 'alindi');
  const total = items.reduce((s, e) => s + n(e.price), 0);
  const missing = items.filter((e) => e.price === null || e.price === '').length;
  const watt = items.reduce((s, e) => s + n(e.watt), 0);
  return { items, total, missing, watt };
}

/* ---------- Kendim üretirsem ---------- */
export function ownCost(state, product, overrides = {}) {
  const s = { ...state.settings, ...overrides };
  const bom = bomCost(state, product);
  const hours = n(overrides.productionHours ?? product.productionHours);
  const inv = investment(state);
  const powerW = n(s.machinePowerW) || inv.watt;
  const electricity = (powerW / 1000) * hours * n(s.electricityTariff);
  const labor = hours * n(s.hourlyRate);
  const packaging = n(product.packagingCost);
  const productionCost = bom.total + electricity + labor; // ambalaj hariç
  const withPackaging = productionCost + packaging;
  const amortUnits = Math.max(1, n(s.amortizationUnits));
  const invPerUnit = inv.total / amortUnits;
  return {
    bom, hours, electricity, labor, packaging, productionCost, withPackaging,
    investmentTotal: inv.total, invPerUnit, withInvestment: withPackaging + invPerUnit, amortUnits,
    incomplete: bom.missing > 0 || (product.bom || []).length === 0,
  };
}

/* ---------- Fason ---------- */
export function fasonCost(state, quote, qty) {
  const product = state.products.find((p) => p.id === quote.productId);
  const materialPerUnit = quote.materialsByWorkshop ? 0 : product ? bomCost(state, product).total : n(quote.materialPerUnit);
  const q = Math.max(1, n(qty));
  const fixed = n(quote.sampleFee) + n(quote.patternFee) + n(quote.shippingTotal);
  const perUnit = n(quote.unitSewing) + n(quote.packagingPerUnit) + n(quote.qcPerUnit) + materialPerUnit;
  const total = fixed + perUnit * q;
  return { fixed, perUnit, materialPerUnit, total, unit: total / q, belowMoq: q < n(quote.moq), qty: q };
}

/* Ürünün birim maliyeti — fiyatlandırma ve dashboard kullanır */
export function unitCostFor(state, productId, cfg = {}) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return 0;
  if (cfg.costSource === 'manuel') return n(cfg.manualCost);
  if (cfg.costSource === 'fason') {
    const q = state.workshops.find((w) => w.id === cfg.fasonQuoteId);
    if (q) return fasonCost(state, q, cfg.fasonQty || q.orderQty).unit;
  }
  return ownCost(state, product).productionCost;
}

/* ---------- Sigorta ---------- */
export function insuranceCalc(state) {
  const ins = state.insurance;
  const min = param(state, 'asgariBrut');
  const max = min * param(state, 'bagkurTavanKat');
  const base = Math.min(max, Math.max(min, n(ins.declaredBase) || min));
  const rate = param(state, 'bagkurOran') - (ins.discount ? param(state, 'bagkurIndirim') : 0);
  const bagkur = (base * rate) / 100;
  const employer = n(ins.employees) * n(ins.employeeGross) * (1 + param(state, 'isverenSgkOran') / 100);
  const owner = ins.scenario === '4b' ? bagkur : 0;
  return { min, max, base, rate, bagkur, owner, employer, monthly: owner + employer };
}

/* ---------- Aylık sabit giderler (tek seferlik giderler ASLA dahil değil) ---------- */
export function monthlyFixed(state) {
  const items = state.expenses.filter((e) => e.active);
  const recurring = items.reduce((s, e) => s + (e.frequency === 'yillik' ? n(e.amount) / 12 : n(e.amount)), 0);
  const ins = insuranceCalc(state);
  return { recurring, insurance: ins.monthly, total: recurring + ins.monthly, yearly: (recurring + ins.monthly) * 12 };
}

/* ---------- Fiyatlandırma ---------- */
export const defaultPricing = (state) => ({
  costSource: 'kendim', manualCost: 0, fasonQuoteId: '', fasonQty: 100,
  packaging: null, shipping: 0, marketplacePct: 0, paymentPct: 0, adPerUnit: 0,
  returnPct: 0, taxPct: 20, kdvRate: param(state, 'kdvCanta') || 20,
  monthlyUnits: 0, includeFixed: true, testPrices: [1500, 2000, 2500, 3000], salePrice: 0,
});

export function pricingConfig(state, productId) {
  return { ...defaultPricing(state), ...(state.pricing[productId] || {}) };
}

export function priceBreakdown(state, productId, price, cfgIn) {
  const cfg = cfgIn || pricingConfig(state, productId);
  const product = state.products.find((p) => p.id === productId);
  const P = n(price);
  const kdv = n(cfg.kdvRate);
  const netSales = P / (1 + kdv / 100);
  const kdvAmount = P - netSales;
  const unitCost = unitCostFor(state, productId, cfg);
  const packaging = cfg.packaging === null || cfg.packaging === '' ? n(product?.packagingCost) : n(cfg.packaging);
  const shipping = n(cfg.shipping);
  const marketplace = (P * n(cfg.marketplacePct)) / 100;
  const payment = (P * n(cfg.paymentPct)) / 100;
  const ad = n(cfg.adPerUnit);
  const returns = (netSales * n(cfg.returnPct)) / 100;
  const variable = unitCost + packaging + shipping + marketplace + payment + ad + returns;
  const contribution = netSales - variable;
  const fixed = monthlyFixed(state).total;
  const fixedPerUnit = cfg.includeFixed && n(cfg.monthlyUnits) > 0 ? fixed / n(cfg.monthlyUnits) : 0;
  const preTax = contribution - fixedPerUnit;
  const taxReserve = Math.max(0, preTax) * (n(cfg.taxPct) / 100);
  const net = preTax - taxReserve;
  // Başabaş satış fiyatı (KDV dahil): net kâr = 0 olacak P
  const fixedVar = unitCost + packaging + shipping + ad + fixedPerUnit;
  const coef = (1 / (1 + kdv / 100)) * (1 - n(cfg.returnPct) / 100) - n(cfg.marketplacePct) / 100 - n(cfg.paymentPct) / 100;
  const breakEvenPrice = coef > 0 ? fixedVar / coef : null;
  return {
    P, netSales, kdvAmount, unitCost, packaging, shipping, marketplace, payment, ad, returns,
    variable, contribution, fixedPerUnit, preTax, taxReserve, net,
    marginPct: netSales > 0 ? (net / netSales) * 100 : 0,
    contributionPct: netSales > 0 ? (contribution / netSales) * 100 : 0,
    breakEvenPrice,
  };
}

/* ---------- Gösterge paneli ---------- */
export function dashboard(state) {
  const s = state.settings;
  const spent = state.ledger.reduce((acc, t) => acc + n(t.amount), 0);
  const produced = state.production.reduce((acc, p) => acc + n(p.qty), 0);
  const productionValue = state.production.reduce((acc, p) => acc + n(p.qty) * n(p.unitCost), 0);
  const avgCost = produced > 0 ? productionValue / produced : null;
  const sold = state.sales.reduce((acc, x) => acc + n(x.qty), 0);
  const revenue = state.sales.reduce((acc, x) => acc + n(x.qty) * n(x.unitPrice), 0);
  const kdvRate = param(state, 'kdvCanta') || 20;
  const revenueNet = revenue / (1 + kdvRate / 100);
  const saleCosts = state.sales.reduce((acc, x) => acc + n(x.extraCosts), 0);

  // Ürün bazlı ortalama üretim maliyeti ile satılan malın maliyeti
  const avgByProduct = {};
  state.production.forEach((p) => {
    const a = (avgByProduct[p.productId] ||= { qty: 0, value: 0 });
    a.qty += n(p.qty);
    a.value += n(p.qty) * n(p.unitCost);
  });
  const cogs = state.sales.reduce((acc, x) => {
    const a = avgByProduct[x.productId];
    const unit = a && a.qty ? a.value / a.qty : avgCost || 0;
    return acc + n(x.qty) * unit;
  }, 0);

  const fixed = monthlyFixed(state);
  const months = Math.max(1, Math.ceil(daysBetween(s.startDate || today(), today()) / 30.44));
  const fixedForPeriod = fixed.total * months;
  const grossProfit = revenueNet - cogs - saleCosts;
  const preTax = grossProfit - fixedForPeriod;
  const taxRes = Math.max(0, preTax) * (n(s.taxReservePct ?? 20) / 100);
  const netProfit = preTax - taxRes;

  // Başabaş: fiyatlandırması yapılan ürünlerin ortalama katkı payı
  const contributions = state.products
    .map((p) => {
      const cfg = pricingConfig(state, p.id);
      if (!n(cfg.salePrice)) return null;
      return priceBreakdown(state, p.id, cfg.salePrice, { ...cfg, includeFixed: false }).contribution;
    })
    .filter((x) => x !== null);
  const avgContribution = contributions.length ? contributions.reduce((a, b) => a + b, 0) / contributions.length : null;
  const breakEvenUnits = avgContribution && avgContribution > 0 ? Math.ceil(fixed.total / avgContribution) : null;

  const t = today();
  const upcoming = state.payments
    .filter((p) => !p.paid)
    .map((p) => ({ ...p, days: daysBetween(t, p.dueDate) }))
    .sort((a, b) => a.days - b.days);

  return {
    capital: n(s.capital), spent, available: n(s.capital) - spent, avgCost, produced, sold, stock: produced - sold,
    revenue, revenueNet, cogs, saleCosts, grossProfit, fixedForPeriod, months, preTax, taxRes, netProfit,
    fixed, avgContribution, breakEvenUnits, upcoming,
    upcomingTotal30: upcoming.filter((p) => p.days <= 30).reduce((a, p) => a + n(p.amount), 0),
  };
}

export function stockByProduct(state) {
  return state.products.map((p) => {
    const produced = state.production.filter((x) => x.productId === p.id).reduce((a, x) => a + n(x.qty), 0);
    const sold = state.sales.filter((x) => x.productId === p.id).reduce((a, x) => a + n(x.qty), 0);
    return { id: p.id, name: p.name, produced, sold, stock: produced - sold };
  });
}
