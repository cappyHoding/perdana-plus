import React from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store/useAppStore';
import { maskAcc, fmt, fmtRp } from '../utils/helpers';
import Button from '../components/ui/Button';

export default function RiwayatPage() {
  const { history, clearHistory } = useAppStore(s => ({
    history: s.history,
    clearHistory: s.clearHistory,
  }));

  const sorted = [...history].sort((a, b) => b.ts - a.ts);

  const exportXlsx = () => {
    const rows = sorted.map((w, i) => ({
      No: i + 1,
      Waktu: new Date(w.ts).toLocaleString('id-ID'),
      Grade: w.gradeName,
      Hadiah: w.prizeName,
      'Nama Pemenang': w.name,
      Cabang: w.branch,
      CIF: w.cif,
      'No. Rekening': maskAcc(w.accNo),
      Poin: w.points,
      'Estimasi Nilai': w.prizeValue,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [5, 20, 14, 28, 10, 24, 14, 18, 9, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Undian');
    XLSX.writeFile(wb, 'riwayat-undian.xlsx');
  };

  const exportCsv = () => {
    const rows = sorted.map(w => [
      new Date(w.ts).toLocaleString('id-ID'),
      w.gradeName,
      w.prizeName,
      w.name,
      w.branch,
      w.cif,
      maskAcc(w.accNo),
      w.points,
      w.prizeValue,
    ]);
    const header = ['Waktu', 'Grade', 'Hadiah', 'Nama Pemenang', 'Cabang', 'CIF', 'No. Rekening', 'Poin', 'Est. Nilai'];
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'riwayat-undian.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (!confirm('Bersihkan semua riwayat undian? Tindakan ini tidak dapat dibatalkan.')) return;
    clearHistory();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Riwayat Undian
          </h1>
          <p className="text-sm text-ink-3 mt-1">{history.length} pemenang tercatat</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={exportXlsx} disabled={!history.length}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!history.length}>
            Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={!history.length}
            className="text-red hover:text-red-deep hover:bg-red/10"
          >
            Bersihkan Riwayat
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream">
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Waktu</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Grade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Hadiah</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Pemenang</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">CIF</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">No. Rekening</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Poin</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-3">
                  Belum ada riwayat undian.
                </td>
              </tr>
            ) : (
              sorted.map((w, i) => (
                <tr key={`${w.ts}-${i}`} className="border-t border-line hover:bg-cream/50 transition-colors">
                  <td className="px-4 py-3 text-xs text-ink-3 whitespace-nowrap">
                    {new Date(w.ts).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}>
                      {w.gradeName}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{w.prizeName}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{w.name}</div>
                    <div className="text-xs text-ink-3">{w.branch}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-3">{w.cif || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-2">{maskAcc(w.accNo)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red" style={{ fontFamily: 'var(--font-mono)' }}>
                    {fmt(w.points)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
