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

export function pointsOfRek(rek: Rekening): number {
  if (rek.mutations?.length) {
    const sorted = [...rek.mutations]
      .map(m => ({ bal: m.balance || 0, ts: parseDate(m.date) }))
      .filter(m => m.ts > 0)
      .sort((a, b) => a.ts - b.ts);
    if (!sorted.length) return 0;
    return sorted.reduce((sum, m, i) => {
      const next = sorted[i + 1];
      const days = next ? Math.max(1, Math.round((next.ts - m.ts) / 86400000)) : 1;
      return sum + Math.floor(m.bal / 100000) * days;
    }, 0);
  }
  return Math.floor((rek.balance || 0) * (rek.days || 0) / 100000);
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
