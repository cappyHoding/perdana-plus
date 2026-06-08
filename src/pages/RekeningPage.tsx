import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store/useAppStore';
import { getCustomers, fmt, fmtRp, avgBalanceRek, pointsOfRek, maskAcc, uid } from '../utils/helpers';
import { eligibleCustomersFor } from '../utils/helpers';
import { sampleRekening, sampleGrades, sampleHadiah } from '../utils/sampleData';
import Button from '../components/ui/Button';
import FormField, { Input, Select } from '../components/ui/FormField';
import { useModal, ModalFooter } from '../components/ui/Modal';
import type { Rekening, Mutation } from '../types';

function RekeningForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Rekening>;
  onSave: (data: Omit<Rekening, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    cif: initial?.cif ?? '',
    accNo: initial?.accNo ?? '',
    name: initial?.name ?? '',
    branch: initial?.branch ?? '',
    balance: String(initial?.balance ?? ''),
    days: String(initial?.days ?? ''),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.accNo) errs.accNo = 'No rekening wajib diisi';
    else if (form.accNo.length !== 11) errs.accNo = 'No rekening harus 11 digit';
    if (!form.name) errs.name = 'Nama wajib diisi';
    if (!form.balance || isNaN(Number(form.balance))) errs.balance = 'Saldo tidak valid';
    if (!form.days || isNaN(Number(form.days))) errs.days = 'Hari tidak valid';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      cif: form.cif.trim(),
      accNo: form.accNo.trim(),
      name: form.name.trim(),
      branch: form.branch.trim(),
      balance: Number(form.balance),
      days: Number(form.days),
      mutations: initial?.mutations,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="CIF">
          <Input value={form.cif} onChange={set('cif')} placeholder="CIF001234" />
        </FormField>
        <FormField label="No. Rekening" required error={errors.accNo}>
          <Input value={form.accNo} onChange={set('accNo')} placeholder="10000022451" maxLength={11} error={!!errors.accNo} />
        </FormField>
      </div>
      <FormField label="Nama Nasabah" required error={errors.name}>
        <Input value={form.name} onChange={set('name')} placeholder="Nama lengkap" error={!!errors.name} />
      </FormField>
      <FormField label="Cabang">
        <Input value={form.branch} onChange={set('branch')} placeholder="Cabang Utama" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Hari Aktif" required error={errors.days}>
          <Input type="number" value={form.days} onChange={set('days')} placeholder="365" error={!!errors.days} />
        </FormField>
        <FormField label="Saldo Rata-rata (Rp)" required error={errors.balance}>
          <Input type="number" value={form.balance} onChange={set('balance')} placeholder="1000000" error={!!errors.balance} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <ModalFooter onCancel={onCancel} onSave={handleSave} />
      </div>
    </div>
  );
}

export default function RekeningPage() {
  const { rekening, grades, hadiah, addRekening, updateRekening, deleteRekening, setRekening, addGrade, addHadiah, setHadiah } = useAppStore(s => ({
    rekening: s.rekening,
    grades: s.grades,
    hadiah: s.hadiah,
    addRekening: s.addRekening,
    updateRekening: s.updateRekening,
    deleteRekening: s.deleteRekening,
    setRekening: s.setRekening,
    addGrade: s.addGrade,
    addHadiah: s.addHadiah,
    setHadiah: s.setHadiah,
  }));

  const { openModal, closeModal } = useModal();
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const sortedGrades = [...grades].sort((a, b) => b.minPoints - a.minPoints);

  const filtered = rekening.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.cif.toLowerCase().includes(q) || r.accNo.includes(q);
    let matchGrade = true;
    if (gradeFilter) {
      const grade = grades.find(g => g.id === gradeFilter);
      if (grade) {
        const customers = getCustomers(rekening);
        const eligible = eligibleCustomersFor(grade, rekening);
        const eligibleKeys = new Set(eligible.map(c => c.key));
        // Check if this rekening belongs to an eligible customer
        const customers2 = getCustomers([r]);
        matchGrade = customers2.some(c => eligibleKeys.has(c.key));
      }
    }
    return matchSearch && matchGrade;
  });

  const openAdd = () => {
    openModal({
      title: 'Tambah Rekening',
      body: (
        <RekeningForm
          onSave={data => { addRekening(data); closeModal(); }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const openEdit = (rek: Rekening) => {
    openModal({
      title: 'Edit Rekening',
      body: (
        <RekeningForm
          initial={rek}
          onSave={data => { updateRekening(rek.id, data); closeModal(); }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const handleDelete = (rek: Rekening) => {
    if (confirm(`Hapus rekening ${rek.accNo} (${rek.name})?`)) {
      deleteRekening(rek.id);
    }
  };

  const loadSample = () => {
    if (!confirm('Ini akan menambahkan 33 rekening contoh. Lanjutkan?')) return;
    const newGrades = sampleGrades();
    const newHadiah = sampleHadiah(newGrades);
    // Write directly to store so grade IDs are preserved (addGrade regenerates IDs)
    // Also sync to events[activeEventId] so data persists on event switch
    useAppStore.setState(s => {
      const grades = [...s.grades, ...newGrades];
      const hadiah = [...s.hadiah, ...newHadiah];
      const rekening = [...s.rekening, ...sampleRekening()];
      return {
        grades,
        hadiah,
        rekening,
        events: s.events.map(e => e.id === s.activeEventId ? { ...e, grades, hadiah, rekening } : e),
      };
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

      if (!rows.length) { alert('File kosong'); return; }

      const firstRow = rows[0];
      const keys = Object.keys(firstRow).map(k => k.toLowerCase());
      const hasMutation = keys.some(k => k === 'date' || k === 'tanggal');

      if (hasMutation) {
        // Mutasi format: group by accNo
        const groups = new Map<string, { rek: Partial<Rekening>; mutations: Mutation[] }>();
        for (const row of rows) {
          const r = row as Record<string, unknown>;
          const accNo = String(r['accNo'] || r['no_rekening'] || r['No Rekening'] || r['no rekening'] || '').trim();
          if (!accNo) continue;
          if (!groups.has(accNo)) {
            groups.set(accNo, {
              rek: {
                accNo,
                cif: String(r['cif'] || r['CIF'] || '').trim(),
                name: String(r['name'] || r['nama'] || r['Nama'] || '').trim(),
                branch: String(r['branch'] || r['cabang'] || r['Cabang'] || '').trim(),
                balance: 0,
                days: 0,
              },
              mutations: [],
            });
          }
          const g = groups.get(accNo)!;
          const rawDate = r['date'] || r['tanggal'] || r['Date'] || r['Tanggal'];
          const dateStr = rawDate instanceof Date
            ? rawDate.toISOString().slice(0, 10)
            : String(rawDate || '');
          const balVal = Number(r['balance'] || r['saldo'] || r['Balance'] || r['Saldo'] || 0);
          g.mutations.push({ date: dateStr, balance: balVal });
        }
        const newReks: Rekening[] = [...groups.values()].map(({ rek, mutations }) => ({
          id: uid(),
          cif: rek.cif || '',
          accNo: rek.accNo || '',
          name: rek.name || '',
          branch: rek.branch || '',
          balance: 0,
          days: 0,
          mutations,
        }));
        setRekening([...rekening, ...newReks]);
        alert(`Berhasil import ${newReks.length} rekening (format mutasi harian)`);
      } else {
        // Sederhana format
        const newReks: Rekening[] = rows.map(r => {
          const row = r as Record<string, unknown>;
          return {
            id: uid(),
            cif: String(row['cif'] || row['CIF'] || '').trim(),
            accNo: String(row['accNo'] || row['no_rekening'] || row['No Rekening'] || row['no rekening'] || '').trim(),
            name: String(row['name'] || row['nama'] || row['Nama'] || '').trim(),
            branch: String(row['branch'] || row['cabang'] || row['Cabang'] || '').trim(),
            balance: Number(row['balance'] || row['saldo'] || row['Saldo'] || 0),
            days: Number(row['days'] || row['hari'] || row['Hari'] || 0),
          };
        }).filter(r => r.accNo);
        setRekening([...rekening, ...newReks]);
        alert(`Berhasil import ${newReks.length} rekening (format sederhana)`);
      }
    } catch (err) {
      alert('Gagal membaca file: ' + String(err));
    }
    e.target.value = '';
  };

  const handleExport = () => {
    const customers = getCustomers(rekening);
    if (!customers.length) { alert('Tidak ada data rekening untuk diekspor'); return; }
    const rows = customers
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map(c => ({
        'No. Rekening': c.displayAccNo,
        'CIF': c.cif,
        'Nama': c.name,
        'Cabang': c.branch,
        'Saldo Rata-rata': Math.round(c.totalBalance),
        'Total Poin': c.totalPoints,
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [14, 12, 26, 18, 18, 12].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekening');
    XLSX.writeFile(wb, `rekening-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    // Sheet 1: Sederhana — satu baris per rekening
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['cif', 'accNo', 'name', 'branch', 'balance', 'days'],
      ['CIF001234', '10000022451', 'Budi Santoso', 'Cabang Utama', 5000000, 365],
      ['CIF001235', '10000022452', 'Siti Rahayu', 'Cabang Selatan', 2000000, 180],
    ]);
    ws1['!cols'] = [10, 14, 24, 18, 14, 8].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws1, 'Sederhana');
    // Sheet 2: Mutasi Saldo — satu baris per perubahan saldo (bukan per hari)
    // Setiap baris = tanggal saldo BERUBAH ke nilai tersebut
    // Poin dihitung: floor(saldo/100.000) × jumlah_hari_saldo_berlaku
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['accNo', 'cif', 'name', 'branch', 'date', 'balance'],
      // Rekening 1 — 3 kali perubahan saldo
      ['10000022451', 'CIF001234', 'Budi Santoso', 'Cabang Utama', '2026-01-01', 5000000],
      ['10000022451', 'CIF001234', 'Budi Santoso', 'Cabang Utama', '2026-02-15', 5500000],
      ['10000022451', 'CIF001234', 'Budi Santoso', 'Cabang Utama', '2026-05-10', 4800000],
      // Rekening 2 — 2 kali perubahan saldo
      ['10000022452', 'CIF001235', 'Siti Rahayu', 'Cabang Selatan', '2026-01-01', 2000000],
      ['10000022452', 'CIF001235', 'Siti Rahayu', 'Cabang Selatan', '2026-03-20', 3000000],
    ]);
    ws2['!cols'] = [14, 10, 24, 18, 12, 14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, 'Mutasi Saldo');
    XLSX.writeFile(wb, 'template-rekening.xlsx');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Data Rekening
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            {rekening.length} rekening · {getCustomers(rekening).length} nasabah unik
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadSample}>
            Muat Contoh Data
          </Button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-3 hover:text-ink hover:bg-cream border border-line transition-colors"
            title="Export data nasabah ke Excel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-3 hover:text-ink hover:bg-cream border border-line transition-colors"
            title="Download file template .xlsx (2 sheet: Sederhana & Mutasi Saldo)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Template
          </button>
          <Button variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Excel/CSV
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button variant="primary" size="sm" onClick={openAdd}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Rekening
          </Button>
        </div>
      </div>

      {/* Format hint */}
      <div
        className="flex items-start gap-3 rounded-xl px-4 py-3 text-xs text-ink-2"
        style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}
      >
        <svg className="w-4 h-4 mt-0.5 shrink-0 text-warn" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="leading-relaxed space-y-1">
          <div>
            <span className="font-semibold">Format Sederhana</span>
            {' — 1 baris per rekening: '}
            {['cif', 'accNo', 'name', 'branch', 'balance', 'days'].map((c, i, a) => (
              <span key={c}><span className="font-mono bg-white/70 px-1 rounded">{c}</span>{i < a.length - 1 ? ', ' : ''}</span>
            ))}
            {'. Poin = floor(saldo × hari / 100.000).'}
          </div>
          <div>
            <span className="font-semibold">Format Mutasi Saldo</span>
            {' — 1 baris per perubahan saldo: '}
            {['accNo', 'cif', 'name', 'branch', 'date', 'balance'].map((c, i, a) => (
              <span key={c}><span className="font-mono bg-white/70 px-1 rounded">{c}</span>{i < a.length - 1 ? ', ' : ''}</span>
            ))}
            {'. Kolom '}
            <span className="font-mono bg-white/70 px-1 rounded">date</span>
            {' = tanggal saldo berubah (format YYYY-MM-DD atau DD/MM/YYYY). Poin dihitung per hari berdasarkan saldo yang berlaku antar tanggal. Download '}
            <button onClick={downloadTemplate} className="underline font-semibold hover:text-ink transition-colors">template .xlsx</button>
            {', '}
            <a href="/templates/template_rekening_sederhana.csv" download className="underline font-semibold hover:text-ink transition-colors">.csv sederhana</a>
            {', atau '}
            <a href="/templates/template_rekening_mutasi.csv" download className="underline font-semibold hover:text-ink transition-colors">.csv mutasi</a>
            {'.'}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama / CIF / no. rek..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-line bg-white focus:outline-none focus:ring-2 focus:ring-yellow focus:border-yellow"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={e => setGradeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-line bg-white focus:outline-none focus:ring-2 focus:ring-yellow"
        >
          <option value="">Semua Grade</option>
          {sortedGrades.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <span className="text-sm text-ink-3 shrink-0">{filtered.length} rekening</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream">
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">No. Rekening</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nasabah</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">CIF</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Cabang</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Hari</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Saldo Rata-rata</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Poin Rek.</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-3">
                  {rekening.length === 0 ? 'Belum ada data. Klik "Muat Contoh Data" atau import file Excel.' : 'Tidak ada hasil pencarian.'}
                </td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="border-t border-line hover:bg-cream/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-ink-2">{maskAcc(r.accNo)}</td>
                  <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-ink-3 text-xs">{r.cif || '—'}</td>
                  <td className="px-4 py-3 text-ink-2 text-xs">{r.branch || '—'}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{r.mutations?.length ? r.mutations.length : r.days}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{fmtRp(avgBalanceRek(r))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red" style={{ fontFamily: 'var(--font-mono)' }}>
                    {fmt(pointsOfRek(r))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-md hover:bg-cream text-ink-3 hover:text-ink transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(r)} className="p-1.5 rounded-md hover:bg-red/10 text-ink-3 hover:text-red transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Format card */}
      <div className="bg-white rounded-xl border border-line p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Format Import</h2>
            <p className="text-xs text-ink-3 mt-0.5">Dua format yang didukung</p>
          </div>
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Unduh Template
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wide">Sederhana</div>
            <pre className="text-xs bg-cream rounded-lg p-3 border border-line overflow-x-auto text-ink-2 font-mono leading-relaxed">{`cif       | accNo        | name  | branch | balance | days
CIF001234 | 10000022451  | Budi  | Utama  | 5000000 | 365`}</pre>
          </div>
          <div>
            <div className="text-xs font-semibold text-ink-2 mb-2 uppercase tracking-wide">Mutasi Harian</div>
            <pre className="text-xs bg-cream rounded-lg p-3 border border-line overflow-x-auto text-ink-2 font-mono leading-relaxed">{`accNo        | cif      | name | branch | date       | balance
10000022451  | CIF001   | Budi | Utama  | 2026-01-01 | 5000000
10000022451  | CIF001   | Budi | Utama  | 2026-01-02 | 5100000`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
