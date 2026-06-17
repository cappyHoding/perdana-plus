import React from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store/useAppStore';
import { eligibleCustomersFor, maskAcc, fmt } from '../utils/helpers';
import Button from '../components/ui/Button';

export default function TiketPage() {
  const { rekening, grades, hadiah, history } = useAppStore(s => ({
    rekening: s.rekening,
    grades: s.grades,
    hadiah: s.hadiah,
    history: s.history,
  }));

  // Build ticket ranges per grade
  const gradeData = grades.map(grade => {
    const eligibles = eligibleCustomersFor(grade, rekening);
    let offset = 0;
    const rows = eligibles.map(c => {
      const start = offset + 1;
      const end = offset + c.totalPoints;
      offset += c.totalPoints;
      return { customer: c, start, end };
    });
    const poolSize = offset;
    const wonKeys = new Set(
      history.filter(w => w.gradeId === grade.id).map(w => w.customerKey)
    );
    return { grade, rows, poolSize, wonKeys };
  });

  const totalCustomers = new Set(
    gradeData.flatMap(g => g.rows.map(r => r.customer.key))
  ).size;
  const totalTickets = gradeData.reduce((s, g) => s + g.poolSize, 0);

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    for (const { grade, rows } of gradeData) {
      if (!rows.length) continue;
      const sheetRows = rows.map((r, i) => ({
        No: i + 1,
        'No. Tiket Awal': r.start.toString().padStart(8, '0'),
        'No. Tiket Akhir': r.end.toString().padStart(8, '0'),
        'Nama Nasabah': r.customer.name,
        CIF: r.customer.cif,
        'No. Rekening': maskAcc(r.customer.displayAccNo),
        'Jumlah Tiket': r.customer.totalPoints,
      }));
      const ws = XLSX.utils.json_to_sheet(sheetRows);
      ws['!cols'] = [4, 16, 16, 28, 14, 18, 13].map(w => ({ wch: w }));
      XLSX.utils.book_append_sheet(wb, ws, grade.name.slice(0, 31));
    }
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
            {totalCustomers} nasabah · {fmt(totalTickets)} tiket
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportXlsx} disabled={totalTickets === 0}>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </Button>
      </div>

      {gradeData.length === 0 ? (
        <div className="bg-white rounded-xl border border-line px-6 py-12 text-center text-sm text-ink-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
          Belum ada grade yang dikonfigurasi.
        </div>
      ) : (
        gradeData.map(({ grade, rows, poolSize, wonKeys }) => (
          <div key={grade.id} className="bg-white rounded-xl border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
            {/* Section header */}
            <div className="flex items-center justify-between px-4 py-3 bg-cream border-b border-line">
              <div className="flex items-center gap-2.5">
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'var(--yellow)', color: 'var(--ink)' }}
                >
                  {grade.name}
                </span>
                <span className="text-xs text-ink-3">{grade.desc}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-3">
                <span>{rows.length} nasabah</span>
                <span className="font-semibold text-ink">{fmt(poolSize)} tiket</span>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink-3">
                Tidak ada nasabah yang memenuhi syarat untuk grade ini.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">No. Tiket</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nama Nasabah</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">CIF</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">No. Rekening</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wide">Poin / Tiket</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const won = wonKeys.has(r.customer.key);
                    return (
                      <tr
                        key={r.customer.key}
                        className={[
                          'border-t border-line transition-colors',
                          won ? 'bg-yellow-tint/60' : 'hover:bg-cream/50',
                        ].join(' ')}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-2 whitespace-nowrap">
                          {r.start.toString().padStart(8, '0')}
                          {r.end > r.start && (
                            <> – {r.end.toString().padStart(8, '0')}</>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-ink">{r.customer.name}</span>
                            {won && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                                style={{ background: 'var(--yellow)', color: 'var(--ink)' }}>
                                Pemenang
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-ink-3">{r.customer.branch}</div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ink-3">{r.customer.cif || '—'}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink-2">{maskAcc(r.customer.displayAccNo)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-red" style={{ fontFamily: 'var(--font-mono)' }}>
                          {fmt(r.customer.totalPoints)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ))
      )}
    </div>
  );
}
