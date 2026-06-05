import type { Rekening, Grade, Customer, Hadiah } from '../types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function pointsOfRek(rek: Rekening): number {
  if (rek.mutations?.length) {
    return rek.mutations.reduce((s, m) => s + Math.floor((m.balance || 0) / 100000), 0);
  }
  return Math.floor((rek.balance || 0) * (rek.days || 0) / 100000);
}

export function avgBalanceRek(rek: Rekening): number {
  if (rek.mutations?.length) {
    return rek.mutations.reduce((s, m) => s + m.balance, 0) / rek.mutations.length;
  }
  return rek.balance || 0;
}

export function daysOfRek(rek: Rekening): number {
  if (rek.mutations?.length) return rek.mutations.length;
  return rek.days || 0;
}

export function lastBalanceRek(rek: Rekening): number {
  if (rek.mutations?.length) {
    const sorted = [...rek.mutations].sort((a, b) => String(a.date).localeCompare(String(b.date)));
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
