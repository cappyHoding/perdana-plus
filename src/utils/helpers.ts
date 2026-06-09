import type { Rekening, Grade, Customer, Hadiah } from '../types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseDate(date: unknown): number {
  if (!date) return 0;
  const s = String(date).trim();
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).getTime();
  // Indonesian: DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return new Date(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`).getTime();
  // Excel serial number (typical range 40000–60000)
  const n = Number(date);
  if (!isNaN(n) && n > 40000 && n < 60000)
    return new Date((n - 25569) * 86400000).getTime();
  const d = new Date(s);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// Normalize any date input to YYYY-MM-DD string for timezone-safe comparisons
function normalizeDateStr(date: unknown): string {
  if (!date) return '';
  const s = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const n = Number(date);
  if (!isNaN(n) && n > 40000 && n < 60000)
    return new Date((n - 25569) * 86400000).toISOString().slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

// Calculation period: June 2025 – May 2026 (12 months), hardcoded per business rules
const PERIOD_MONTHS = [
  { y: 2025, m: 6, days: 30 }, { y: 2025, m: 7, days: 31 },
  { y: 2025, m: 8, days: 31 }, { y: 2025, m: 9, days: 30 },
  { y: 2025, m: 10, days: 31 }, { y: 2025, m: 11, days: 30 },
  { y: 2025, m: 12, days: 31 }, { y: 2026, m: 1, days: 31 },
  { y: 2026, m: 2, days: 28 }, { y: 2026, m: 3, days: 31 },
  { y: 2026, m: 4, days: 30 }, { y: 2026, m: 5, days: 31 },
];

export function pointsOfRek(rek: Rekening): number {
  const openStr = rek.openDate ? normalizeDateStr(rek.openDate) : '';

  // Simple format: poin per active month (floor(balance/100k) each full/partial month)
  if (!rek.mutations?.length) {
    let months = 0;
    for (const { y, m, days } of PERIOD_MONTHS) {
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      const lastDayStr = `${prefix}-${String(days).padStart(2, '0')}`;
      if (openStr && openStr > lastDayStr) continue;
      months++;
    }
    return Math.floor((rek.balance || 0) / 100000) * months;
  }

  const sorted = [...rek.mutations]
    .map(m => ({ d: normalizeDateStr(m.date), bal: m.balance || 0 }))
    .filter(m => m.d !== '')
    .sort((a, b) => a.d.localeCompare(b.d));

  if (!sorted.length) return 0;

  let total = 0;

  for (const { y, m, days } of PERIOD_MONTHS) {
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const lastDayStr = `${prefix}-${String(days).padStart(2, '0')}`;

    // Skip months before account opening
    if (openStr && openStr > lastDayStr) continue;

    // Effective start day: 1 normally, openDay for the opening month
    const startDay = (openStr && openStr.startsWith(prefix))
      ? parseInt(openStr.slice(8, 10), 10)
      : 1;
    const effectiveDays = days - startDay + 1;
    const startDayStr = `${prefix}-${String(startDay).padStart(2, '0')}`;

    // Balance before startDay = last mutation with d < startDayStr
    let startBal = 0;
    for (const mut of sorted) {
      if (mut.d < startDayStr) startBal = mut.bal;
      else break;
    }

    // Mutations from startDay onwards within this month
    const inMonth = sorted.filter(mut =>
      mut.d.startsWith(prefix) && mut.d >= startDayStr
    );

    let sumDaily = 0;
    let prevDay = startDay;
    let curBal = startBal;

    for (const mut of inMonth) {
      const day = parseInt(mut.d.slice(8, 10), 10);
      sumDaily += curBal * (day - prevDay);
      curBal = mut.bal;
      prevDay = day;
    }
    sumDaily += curBal * (days - prevDay + 1);

    total += Math.floor(sumDaily / effectiveDays / 100000);
  }

  return total;
}

export function avgBalanceRek(rek: Rekening): number {
  if (rek.mutations?.length) {
    const sorted = [...rek.mutations]
      .map(m => ({ bal: m.balance || 0, ts: parseDate(m.date) }))
      .filter(m => m.ts > 0)
      .sort((a, b) => a.ts - b.ts);
    if (!sorted.length) return 0;
    let totalW = 0, totalD = 0;
    sorted.forEach((m, i) => {
      const next = sorted[i + 1];
      const days = next ? Math.max(1, Math.round((next.ts - m.ts) / 86400000)) : 1;
      totalW += m.bal * days;
      totalD += days;
    });
    return totalD > 0 ? totalW / totalD : 0;
  }
  return rek.balance || 0;
}

export function daysOfRek(rek: Rekening): number {
  if (rek.mutations?.length) {
    const ts = rek.mutations.map(m => parseDate(m.date)).filter(t => t > 0);
    if (ts.length < 2) return ts.length;
    return Math.round((Math.max(...ts) - Math.min(...ts)) / 86400000) + 1;
  }
  return rek.days || 0;
}

export function lastBalanceRek(rek: Rekening): number {
  if (rek.mutations?.length) {
    const sorted = [...rek.mutations].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    return sorted[sorted.length - 1].balance || 0;
  }
  return rek.balance || 0;
}

export function customerKey(rek: Rekening): string {
  return rek.cif?.trim() ? rek.cif.trim() : ('NM::' + (rek.name || '').trim().toLowerCase());
}

export function getCustomers(rekening: Rekening[]): Customer[] {
  const map = new Map<string, Customer>();
  for (const r of rekening) {
    const k = customerKey(r);
    if (!map.has(k)) {
      map.set(k, {
        key: k,
        cif: r.cif || '',
        name: r.name || '',
        branch: r.branch || '',
        accounts: [],
        totalPoints: 0,
        totalBalance: 0,
        totalLastBalance: 0,
        displayAccNo: '',
      });
    }
    const c = map.get(k)!;
    c.accounts.push(r);
    c.totalPoints += pointsOfRek(r);
    c.totalBalance += avgBalanceRek(r);
    c.totalLastBalance += lastBalanceRek(r);
    if (!c.name && r.name) c.name = r.name;
    if (!c.branch && r.branch) c.branch = r.branch;
  }
  for (const c of map.values()) {
    c.displayAccount = c.accounts.slice().sort((a, b) => avgBalanceRek(b) - avgBalanceRek(a))[0];
    c.displayAccNo = c.displayAccount?.accNo || '';
  }
  return [...map.values()];
}

export function eligibleCustomersFor(grade: Grade, rekening: Rekening[]): Customer[] {
  const minBal = grade.minBalance || 0;
  return getCustomers(rekening).filter(
    (c) => c.totalPoints >= grade.minPoints && c.totalLastBalance >= minBal
  );
}

export function maskAcc(acc: string): string {
  if (!acc) return '';
  const s = String(acc);
  if (s.length <= 5) return s;
  return s[0] + '*'.repeat(s.length - 5) + s.slice(-4);
}

export function fmt(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(n));
}

export function fmtRp(n: number): string {
  return 'Rp ' + fmt(n);
}

export function getOrderedHadiah(hadiah: Hadiah[]): Hadiah[] {
  return [...hadiah].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function normalizeOrders(hadiah: Hadiah[]): Hadiah[] {
  const sorted = getOrderedHadiah(hadiah);
  return sorted.map((h, i) => ({ ...h, order: i + 1 }));
}

export function moveHadiah(hadiah: Hadiah[], id: string, dir: 'up' | 'down'): Hadiah[] {
  const sorted = getOrderedHadiah(hadiah);
  const idx = sorted.findIndex((h) => h.id === id);
  if (idx < 0) return hadiah;
  const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= sorted.length) return hadiah;
  const newSorted = [...sorted];
  const tempOrder = newSorted[idx].order;
  newSorted[idx] = { ...newSorted[idx], order: newSorted[targetIdx].order };
  newSorted[targetIdx] = { ...newSorted[targetIdx], order: tempOrder };
  return hadiah.map((h) => {
    const found = newSorted.find((n) => n.id === h.id);
    return found ? found : h;
  });
}

export function resizeImageToDataURL(file: File, maxPx = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) {
          height = Math.round((height * maxPx) / width);
          width = maxPx;
        } else {
          width = Math.round((width * maxPx) / height);
          height = maxPx;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = reject;
    img.src = url;
  });
}
