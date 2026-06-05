import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { eligibleCustomersFor, fmtRp, fmt } from '../utils/helpers';
import Button from '../components/ui/Button';
import FormField, { Input } from '../components/ui/FormField';
import { useModal, ModalFooter } from '../components/ui/Modal';
import type { Grade } from '../types';

function GradeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Grade>;
  onSave: (data: Omit<Grade, 'id'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    desc: initial?.desc ?? '',
    minPoints: String(initial?.minPoints ?? ''),
    minBalance: String(initial?.minBalance ?? '0'),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'Nama grade wajib diisi';
    if (!form.minPoints || isNaN(Number(form.minPoints))) errs.minPoints = 'Min. poin tidak valid';
    if (isNaN(Number(form.minBalance))) errs.minBalance = 'Min. saldo tidak valid';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      desc: form.desc.trim(),
      minPoints: Number(form.minPoints),
      minBalance: Number(form.minBalance),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Nama Grade" required error={errors.name}>
        <Input value={form.name} onChange={set('name')} placeholder="Grade A" error={!!errors.name} />
      </FormField>
      <FormField label="Deskripsi">
        <Input value={form.desc} onChange={set('desc')} placeholder="Keterangan opsional" />
      </FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Poin Minimal" required error={errors.minPoints}>
          <Input type="number" value={form.minPoints} onChange={set('minPoints')} placeholder="300" error={!!errors.minPoints} />
        </FormField>
        <FormField label="Saldo Terakhir Minimal (Rp)" hint="Isi 0 jika tanpa syarat saldo" error={errors.minBalance}>
          <Input type="number" value={form.minBalance} onChange={set('minBalance')} placeholder="0" error={!!errors.minBalance} />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <ModalFooter onCancel={onCancel} onSave={handleSave} />
      </div>
    </div>
  );
}

export default function GradePage() {
  const { grades, hadiah, rekening, addGrade, updateGrade, deleteGrade } = useAppStore(s => ({
    grades: s.grades,
    hadiah: s.hadiah,
    rekening: s.rekening,
    addGrade: s.addGrade,
    updateGrade: s.updateGrade,
    deleteGrade: s.deleteGrade,
  }));

  const { openModal, closeModal } = useModal();
  const sortedGrades = [...grades].sort((a, b) => b.minPoints - a.minPoints);
  const importRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.aoa_to_sheet([
      ['name', 'desc', 'minPoints', 'minBalance'],
      ['Grade A', 'Nasabah prioritas utama', 600, 5000000],
      ['Grade B', 'Nasabah aktif menengah', 300, 2000000],
      ['Grade C', 'Nasabah umum', 200, 0],
    ]);
    ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 14 }, { wch: 22 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Grade');
    writeFile(wb, 'template_grade.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    let rows: unknown[][] = [];
    if (file.name.match(/\.xlsx?$/i)) {
      const { read, utils } = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
    } else {
      const text = await file.text();
      rows = text.split('\n').map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
    }

    const firstCell = String(rows[0]?.[0] ?? '').toLowerCase();
    const startRow = firstCell.match(/^(name|nama|grade|no)/) ? 1 : 0;
    let count = 0;
    for (const row of rows.slice(startRow)) {
      const name = String(row[0] ?? '').trim();
      if (!name) continue;
      addGrade({
        name,
        desc: String(row[1] ?? '').trim(),
        minPoints: Number(row[2]) || 0,
        minBalance: Number(row[3]) || 0,
      });
      count++;
    }
    alert(count > 0 ? `${count} grade berhasil diimpor` : 'Tidak ada data valid ditemukan');
  };

  const openAdd = () => {
    openModal({
      title: 'Tambah Grade',
      body: (
        <GradeForm
          onSave={data => { addGrade(data); closeModal(); }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const openEdit = (grade: Grade) => {
    openModal({
      title: 'Edit Grade',
      body: (
        <GradeForm
          initial={grade}
          onSave={data => { updateGrade(grade.id, data); closeModal(); }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const handleDelete = (grade: Grade) => {
    const hasPrizes = hadiah.some(h => h.gradeId === grade.id);
    if (hasPrizes) {
      if (!confirm(`Grade "${grade.name}" memiliki hadiah terkait. Menghapus grade ini juga akan mempengaruhi hadiah tersebut. Lanjutkan?`)) return;
    } else {
      if (!confirm(`Hapus grade "${grade.name}"?`)) return;
    }
    deleteGrade(grade.id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Grade Hadiah
          </h1>
          <p className="text-sm text-ink-3 mt-1">{grades.length} grade terdaftar</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-3 hover:text-ink hover:bg-cream border border-line transition-colors"
            title="Download file template .xlsx"
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
            Import CSV/Excel
          </Button>
          <Button variant="primary" size="sm" onClick={openAdd}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Grade
          </Button>
          <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
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
        <div className="leading-relaxed">
          <span className="font-semibold">Format CSV/Excel (4 kolom):</span>
          {' '}
          <span className="font-mono bg-white/70 px-1 rounded">name</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">desc</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">minPoints</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">minBalance</span>
          {' — Baris pertama (header) dilewati otomatis. Download '}
          <button onClick={downloadTemplate} className="underline font-semibold hover:text-ink transition-colors">template .xlsx</button>
          {' atau '}
          <a href="/templates/template_grade.csv" download className="underline font-semibold hover:text-ink transition-colors">template .csv</a>
          {' sebagai panduan.'}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream">
              <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide w-10">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nama Grade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Deskripsi</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Min. Poin</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Min. Saldo Terakhir</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Jml. Hadiah</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nasabah Eligible</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sortedGrades.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-3">
                  Belum ada grade. Klik "Tambah Grade" untuk memulai.
                </td>
              </tr>
            ) : (
              sortedGrades.map((g, i) => {
                const eligible = eligibleCustomersFor(g, rekening);
                const prizeCount = hadiah.filter(h => h.gradeId === g.id).length;
                return (
                  <tr key={g.id} className="border-t border-line hover:bg-cream/50 transition-colors">
                    <td className="px-4 py-3 text-center text-xs text-ink-3">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{g.name}</td>
                    <td className="px-4 py-3 text-ink-3 text-xs">{g.desc || '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-ink-2">{fmt(g.minPoints)}</td>
                    <td className="px-4 py-3 text-right text-ink-2">{g.minBalance > 0 ? fmtRp(g.minBalance) : '—'}</td>
                    <td className="px-4 py-3 text-right text-ink-2">{prizeCount}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red">{eligible.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(g)} className="p-1.5 rounded-md hover:bg-cream text-ink-3 hover:text-ink transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(g)} className="p-1.5 rounded-md hover:bg-red/10 text-ink-3 hover:text-red transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
