import React, { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getOrderedHadiah, moveHadiah, fmtRp, resizeImageToDataURL } from '../utils/helpers';
import Button from '../components/ui/Button';
import FormField, { Input, Select } from '../components/ui/FormField';
import { useModal, ModalFooter } from '../components/ui/Modal';
import type { Hadiah } from '../types';

function GiftIcon() {
  return (
    <svg className="w-10 h-10 text-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function HadiahForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Hadiah>;
  onSave: (data: Omit<Hadiah, 'id'>) => void;
  onCancel: () => void;
}) {
  const grades = useAppStore(s => s.grades);
  const sortedGrades = [...grades].sort((a, b) => b.minPoints - a.minPoints);
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    order: String(initial?.order ?? ''),
    gradeId: initial?.gradeId ?? (sortedGrades[0]?.id ?? ''),
    name: initial?.name ?? '',
    value: String(initial?.value ?? ''),
    qty: String(initial?.qty ?? '1'),
    note: initial?.note ?? '',
    photo: initial?.photo ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataURL(file, 900);
      setForm(f => ({ ...f, photo: dataUrl }));
    } catch {
      alert('Gagal memuat foto');
    }
    e.target.value = '';
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name) errs.name = 'Nama hadiah wajib diisi';
    if (!form.gradeId) errs.gradeId = 'Grade wajib dipilih';
    if (!form.value || isNaN(Number(form.value))) errs.value = 'Nilai tidak valid';
    if (!form.qty || isNaN(Number(form.qty)) || Number(form.qty) < 1) errs.qty = 'Kuantitas minimal 1';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      order: Number(form.order) || 0,
      gradeId: form.gradeId,
      name: form.name.trim(),
      value: Number(form.value),
      qty: Number(form.qty),
      note: form.note.trim(),
      photo: form.photo,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Photo upload */}
      <div>
        <div className="text-sm font-medium text-ink mb-2">Foto Hadiah</div>
        <div className="flex items-center gap-4">
          <div
            className="w-[120px] h-[120px] rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{
              background: form.photo ? 'transparent' : 'linear-gradient(135deg, var(--yellow-tint), var(--yellow-soft))',
              border: '1px solid var(--line)',
            }}
          >
            {form.photo ? (
              <img src={form.photo} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <GiftIcon />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" onClick={() => photoRef.current?.click()}>
              Pilih Foto
            </Button>
            {form.photo && (
              <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, photo: '' }))}>
                Hapus Foto
              </Button>
            )}
            <p className="text-xs text-ink-3">Max 900px, JPEG</p>
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Urutan Pengundian">
          <Input type="number" value={form.order} onChange={set('order')} placeholder="1" />
        </FormField>
        <FormField label="Grade" required error={errors.gradeId}>
          <Select value={form.gradeId} onChange={set('gradeId')} error={!!errors.gradeId}>
            <option value="">Pilih grade...</option>
            {sortedGrades.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Nama Hadiah" required error={errors.name}>
        <Input value={form.name} onChange={set('name')} placeholder="Nama hadiah" error={!!errors.name} />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Estimasi Nilai (Rp)" required error={errors.value}>
          <Input type="number" value={form.value} onChange={set('value')} placeholder="500000" error={!!errors.value} />
        </FormField>
        <FormField label="Kuantitas" required error={errors.qty}>
          <Input type="number" value={form.qty} onChange={set('qty')} min={1} error={!!errors.qty} />
        </FormField>
      </div>

      <FormField label="Catatan">
        <Input value={form.note} onChange={set('note')} placeholder="Catatan opsional" />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <ModalFooter onCancel={onCancel} onSave={handleSave} />
      </div>
    </div>
  );
}

export default function HadiahPage() {
  const { grades, hadiah, addHadiah, updateHadiah, deleteHadiah, setHadiah } = useAppStore(s => ({
    grades: s.grades,
    hadiah: s.hadiah,
    addHadiah: s.addHadiah,
    updateHadiah: s.updateHadiah,
    deleteHadiah: s.deleteHadiah,
    setHadiah: s.setHadiah,
  }));

  const { openModal, closeModal } = useModal();
  const ordered = getOrderedHadiah(hadiah);
  const importRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    const { utils, writeFile } = await import('xlsx');
    // Use real grade names from store, fall back to examples if empty
    const gradeExamples = grades.length > 0
      ? grades.map(g => g.name)
      : ['Grade A', 'Grade B', 'Grade C'];
    const g0 = gradeExamples[gradeExamples.length - 1] ?? 'Grade C';
    const g1 = gradeExamples[Math.floor(gradeExamples.length / 2)] ?? 'Grade B';
    const g2 = gradeExamples[0] ?? 'Grade A';
    const ws = utils.aoa_to_sheet([
      ['order', 'gradeName', 'name', 'note', 'value', 'qty'],
      [1, g0, 'Voucher Belanja', 'Senilai Rp 500.000', 500000, 3],
      [2, g0, 'Rice Cooker Miyako', '', 450000, 2],
      [3, g1, 'Mesin Cuci LG', '', 3000000, 2],
      [4, g1, 'Smart TV 43"', '', 4500000, 2],
      [5, g2, 'Kulkas 2 Pintu Sharp', '', 5500000, 2],
      [6, g2, 'Sepeda Motor Honda Beat', 'Grand Prize', 18000000, 1],
    ]);
    ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 12 }, { wch: 6 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Hadiah');
    writeFile(wb, 'template_hadiah.xlsx');
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
    const startRow = firstCell.match(/^(order|urutan|no|#)/) ? 1 : 0;
    let count = 0;
    const errors: string[] = [];

    for (const row of rows.slice(startRow)) {
      const gradeName = String(row[1] ?? '').trim();
      const name = String(row[2] ?? '').trim();
      if (!name) continue;
      const grade = grades.find(g => g.name.toLowerCase() === gradeName.toLowerCase());
      if (!grade) {
        errors.push(`Grade "${gradeName}" tidak ditemukan (hadiah: "${name}")`);
        continue;
      }
      addHadiah({
        order: Number(row[0]) || 0,
        gradeId: grade.id,
        name,
        note: String(row[3] ?? '').trim(),
        value: Number(row[4]) || 0,
        qty: Number(row[5]) || 1,
        photo: '',
      });
      count++;
    }

    let msg = count > 0 ? `${count} hadiah berhasil diimpor.` : 'Tidak ada data valid ditemukan.';
    if (errors.length > 0) msg += `\n\nGagal (${errors.length}):\n${errors.join('\n')}`;
    alert(msg);
  };

  const openAdd = () => {
    const nextOrder = ordered.length > 0 ? ordered[ordered.length - 1].order + 1 : 1;
    openModal({
      title: 'Tambah Hadiah',
      body: (
        <HadiahForm
          initial={{ order: nextOrder }}
          onSave={data => {
            addHadiah(data);
            closeModal();
          }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const openEdit = (h: Hadiah) => {
    openModal({
      title: 'Edit Hadiah',
      body: (
        <HadiahForm
          initial={h}
          onSave={data => { updateHadiah(h.id, data); closeModal(); }}
          onCancel={closeModal}
        />
      ),
    });
  };

  const handleDelete = (h: Hadiah) => {
    if (!confirm(`Hapus hadiah "${h.name}"?`)) return;
    deleteHadiah(h.id);
  };

  const handleMove = (id: string, dir: 'up' | 'down') => {
    setHadiah(moveHadiah(hadiah, id, dir));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            Daftar Hadiah
          </h1>
          <p className="text-sm text-ink-3 mt-1">
            {hadiah.length} hadiah · total {hadiah.reduce((s, h) => s + (h.qty || 1), 0)} unit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-3 hover:text-ink hover:bg-cream border border-line transition-colors"
            title="Download file template .xlsx (kolom diisi dengan nama grade yang sudah ada)"
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
            Tambah Hadiah
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
          <span className="font-semibold">Format CSV/Excel (6 kolom):</span>
          {' '}
          <span className="font-mono bg-white/70 px-1 rounded">order</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">gradeName</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">name</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">note</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">value</span>
          {', '}
          <span className="font-mono bg-white/70 px-1 rounded">qty</span>
          {' — Kolom '}
          <span className="font-mono bg-white/70 px-1 rounded">gradeName</span>
          {' harus sama persis dengan nama grade yang sudah ada. '}
          {grades.length > 0 && (
            <>
              {'Grade terdaftar: '}
              {grades.map((g, i) => (
                <span key={g.id}>
                  <span className="font-mono font-semibold">{g.name}</span>
                  {i < grades.length - 1 ? ', ' : '. '}
                </span>
              ))}
            </>
          )}
          {'Download '}
          <button onClick={downloadTemplate} className="underline font-semibold hover:text-ink transition-colors">template .xlsx</button>
          {' atau '}
          <a href="/templates/template_hadiah.csv" download className="underline font-semibold hover:text-ink transition-colors">template .csv</a>
          {' sebagai panduan.'}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-line overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream">
              <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide w-24">Urutan</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide w-16">Foto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Grade</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Nama Hadiah</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Catatan</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Est. Nilai</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-ink-3 uppercase tracking-wide">Qty</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {ordered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-ink-3">
                  Belum ada hadiah. Klik "Tambah Hadiah" untuk memulai.
                </td>
              </tr>
            ) : (
              ordered.map((h, i) => {
                const grade = grades.find(g => g.id === h.gradeId);
                return (
                  <tr key={h.id} className="border-t border-line hover:bg-cream/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs font-mono text-ink-2 w-6 text-center">{h.order}</span>
                        <div className="order-arrows flex flex-col gap-0.5">
                          <button onClick={() => handleMove(h.id, 'up')} disabled={i === 0}>▲</button>
                          <button onClick={() => handleMove(h.id, 'down')} disabled={i === ordered.length - 1}>▼</button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, var(--yellow-tint), var(--yellow-soft))', border: '1px solid var(--line)' }}
                      >
                        {h.photo ? (
                          <img src={h.photo} alt={h.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-5 h-5 text-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {grade ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}>
                          {grade.name}
                        </span>
                      ) : <span className="text-xs text-ink-3">—</span>}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{h.name}</td>
                    <td className="px-4 py-3 text-xs text-ink-3">{h.note || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-red">{fmtRp(h.value)}</td>
                    <td className="px-4 py-3 text-center text-ink-2">{h.qty}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(h)} className="p-1.5 rounded-md hover:bg-cream text-ink-3 hover:text-ink transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(h)} className="p-1.5 rounded-md hover:bg-red/10 text-ink-3 hover:text-red transition-colors">
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
