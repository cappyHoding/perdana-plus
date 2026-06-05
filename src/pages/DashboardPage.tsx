import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { getCustomers, eligibleCustomersFor, fmt, fmtRp, maskAcc } from '../utils/helpers';

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div
      className={[
        'rounded-xl p-5',
        accent
          ? 'bg-yellow text-ink'
          : 'bg-white border border-line',
      ].join(' ')}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-ink-3 mb-2">{label}</div>
      <div
        className="text-3xl font-bold"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-ink-3 mt-1">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { rekening, grades, hadiah } = useAppStore(s => ({
    rekening: s.rekening,
    grades: s.grades,
    hadiah: s.hadiah,
  }));

  const customers = getCustomers(rekening);
  const totalPoints = customers.reduce((s, c) => s + c.totalPoints, 0);
  const sortedGrades = [...grades].sort((a, b) => b.minPoints - a.minPoints);

  const top10 = [...customers]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-ink-3 mt-1">Ringkasan data pengundian Tabungan Perdana Plus</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Nasabah" value={fmt(customers.length)} />
        <StatCard label="Total Poin" value={fmt(totalPoints)} />
        <StatCard
          label="Grade Hadiah"
          value={grades.length}
          sub={`${hadiah.length} hadiah terdaftar`}
        />
        <StatCard
          label="Status"
          value="Siap Undian"
          accent
        />
      </div>

      {/* Grade distribution */}
      <div
        className="bg-white rounded-xl border border-line overflow-hidden"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-base font-semibold text-ink">Distribusi Nasabah per Grade</h2>
        </div>
        {grades.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-ink-3">
            Belum ada grade. Buat grade terlebih dahulu di menu Grade Hadiah.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream">
                <th className="text-left px-6 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Grade</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Min. Poin</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Min. Saldo Terakhir</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Jumlah Hadiah</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nasabah Eligible</th>
              </tr>
            </thead>
            <tbody>
              {sortedGrades.map(g => {
                const eligible = eligibleCustomersFor(g, rekening);
                const prizeCount = hadiah.filter(h => h.gradeId === g.id).length;
                return (
                  <tr key={g.id} className="border-t border-line hover:bg-cream/60 transition-colors">
                    <td className="px-6 py-3 font-medium text-ink">{g.name}</td>
                    <td className="px-6 py-3 text-right font-mono text-ink-2">{fmt(g.minPoints)}</td>
                    <td className="px-6 py-3 text-right text-ink-2">{g.minBalance > 0 ? fmtRp(g.minBalance) : '—'}</td>
                    <td className="px-6 py-3 text-right text-ink-2">{prizeCount}</td>
                    <td className="px-6 py-3 text-right font-semibold text-red">{eligible.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Top 10 */}
      <div
        className="bg-white rounded-xl border border-line overflow-hidden"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="px-6 py-4 border-b border-line">
          <h2 className="text-base font-semibold text-ink">Top 10 Nasabah Berdasarkan Poin</h2>
        </div>
        {customers.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-ink-3">
            Belum ada data rekening.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream">
                <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide w-10">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nasabah</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Rekening Utama</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Rek.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Poin Total</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((c, i) => (
                <tr key={c.key} className="border-t border-line hover:bg-cream/60 transition-colors">
                  <td className="px-4 py-3 text-center text-xs text-ink-3">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{c.name}</div>
                    <div className="text-xs text-ink-3">{c.cif} · {c.branch}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-2">{maskAcc(c.displayAccNo)}</td>
                  <td className="px-4 py-3 text-center text-ink-2">{c.accounts.length}</td>
                  <td className="px-4 py-3 text-right font-bold text-red" style={{ fontFamily: 'var(--font-mono)' }}>
                    {fmt(c.totalPoints)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
