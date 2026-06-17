import React from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store/useAppStore';
import { getCustomers, eligibleCustomersFor, maskAcc, fmt } from '../utils/helpers';
import Button from '../components/ui/Button';

export default function TiketPage() {
  const { rekening, grades, history } = useAppStore(s => ({
    rekening: s.rekening,
    grades: s.grades,
    history: s.history,
  }));

  // All customers with global ticket ranges (sorted by ticketStart)
  const allCustomers = getCustomers(rekening)
    .filter(c => c.totalPoints > 0)
    .sort((a, b) => a.ticketStart - b.ticketStart);

  const totalTickets = allCustomers.reduce((s, c) => s + c.totalPoints, 0);

  // Per-grade eligible summary (for badges)
  const gradeSummary = grades.map(grade => {
    const eligibles = eligibleCustomersFor(grade, rekening);
    return {
      grade,
      count: eligibles.length,
      tickets: eligibles.reduce((s, c) => s + c.totalPoints, 0),
    };
  });

  // Customers who have won (any grade)
  const wonKeys = new Set(history.map(w => w.customerKey));

  const exportXlsx = () => {
    const rows = allCustomers.map((c, i) => ({
      No: i + 1,
      'No. Tiket Awal': c.ticketStart.toString().padStart(8, '0'),
      'No. Tiket Akhir': c.ticketEnd.toString().padStart(8, '0'),
      'Nama Nasabah': c.name,
      CIF: c.cif,
      'No. Rekening': maskAcc(c.displayAccNo),
      'Jumlah Tiket': c.totalPoints,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [4, 16, 16, 28, 14, 18, 13].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nomor Undian');
    XLSX.writeFile(wb, 'daftar-nomor-undian.xlsx');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Daftar Nomor Undian
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            {allCustomers.length} nasabah · {fmt(totalTickets)} tiket
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportXlsx} disabled={allCustomers.length === 0}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </Button>
      </div>

      {/* Per-grade summary badges */}
      {gradeSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {gradeSummary.map(({ grade, count, tickets }) => (
            <div
              key={grade.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}
            >
              <span className="font-semibold text-ink">{grade.name}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-2">{count} nasabah</span>
              <span className="text-ink-3">·</span>
              <span className="font-semibold text-red">{fmt(tickets)} tiket</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        {allCustomers.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-ink-3">
            Belum ada data rekening dengan poin.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">No. Tiket</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nama Nasabah</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">CIF</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">No. Rekening</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">Poin / Tiket</th>
              </tr>
            </thead>
            <tbody>
              {allCustomers.map(c => {
                const won = wonKeys.has(c.key);
                return (
                  <tr
                    key={c.key}
                    className={[
                      'border-t border-line transition-colors',
                      won ? 'bg-yellow-tint/60' : 'hover:bg-cream/50',
                    ].join(' ')}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-2 whitespace-nowrap">
                      {c.ticketStart.toString().padStart(8, '0')}
                      {c.ticketEnd > c.ticketStart && (
                        <> – {c.ticketEnd.toString().padStart(8, '0')}</>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-ink">{c.name}</span>
                        {won && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: 'var(--yellow)', color: 'var(--ink)' }}
                          >
                            Pemenang
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-3">{c.branch}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-3">{c.cif || '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-ink-2">{maskAcc(c.displayAccNo)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red" style={{ fontFamily: 'var(--font-mono)' }}>
                      {fmt(c.totalPoints)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
