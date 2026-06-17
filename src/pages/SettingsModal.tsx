import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import Button from '../components/ui/Button';
import FormField, { Input, Select } from '../components/ui/FormField';
import { resizeImageToDataURL } from '../utils/helpers';
import type { AppState } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const {
    period, password, audio, drawBg, events, activeEventId,
    updateSettings, resetAll, importState, updateEventMeta, deleteEvent,
  } = useAppStore(s => ({
    period: s.period,
    password: s.password,
    audio: s.audio,
    drawBg: s.drawBg,
    events: s.events,
    activeEventId: s.activeEventId,
    updateSettings: s.updateSettings,
    resetAll: s.resetAll,
    importState: s.importState,
    updateEventMeta: s.updateEventMeta,
    deleteEvent: s.deleteEvent,
  }));

  const importRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataURL(file, 1920);
      updateSettings({ drawBg: dataUrl });
    } catch {
      alert('Gagal memuat gambar.');
    }
    e.target.value = '';
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPeriod, setEditPeriod] = useState('');

  const [form, setForm] = useState({
    period,
    password,
    audio: String(audio),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    updateSettings({
      period: form.period,
      password: form.password,
      audio: form.audio === 'true',
    });
    onClose();
  };

  const handleExportBackup = () => {
    const state = useAppStore.getState();
    const data = {
      password: state.password,
      audio: state.audio,
      activeEventId: state.activeEventId,
      events: state.events,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-perdana-undian-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as Partial<AppState>;
      if (!confirm('Import backup akan menggantikan semua data saat ini. Lanjutkan?')) return;
      importState(data);
      onClose();
    } catch (err) {
      alert('File backup tidak valid: ' + String(err));
    }
    e.target.value = '';
  };

  const handleReset = () => {
    if (!confirm('PERINGATAN: Ini akan menghapus semua data undian yang aktif (rekening, grade, hadiah, riwayat). Tindakan ini tidak dapat dibatalkan.\n\nKetuk OK untuk melanjutkan.')) return;
    if (!confirm('Yakin? Semua data undian aktif akan dihapus permanen.')) return;
    resetAll();
    onClose();
  };

  const startEdit = (id: string) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    setEditingId(id);
    setEditName(ev.name);
    setEditPeriod(ev.period);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateEventMeta(editingId, { name: editName.trim(), period: editPeriod.trim() });
    setEditingId(null);
  };

  const handleDeleteEvent = (id: string) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    if (!confirm(`Hapus undian "${ev.name}"? Semua data (rekening, grade, hadiah, riwayat) dalam undian ini akan hilang permanen.`)) return;
    deleteEvent(id);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ background: 'rgba(44,42,41,.42)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
        <motion.div
          className="relative bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden"
          style={{ width: '100%', maxWidth: '540px', maxHeight: '90vh' }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
            <h2 className="text-base font-semibold text-ink">Pengaturan</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream text-ink-3 hover:text-ink transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

            {/* Active event settings */}
            <div className="flex flex-col gap-4">
              <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
                Undian Aktif — {events.find(e => e.id === activeEventId)?.name ?? '—'}
              </div>
              <FormField label="Periode Pengundian">
                <Input value={form.period} onChange={set('period')} placeholder="Tahun 2026" />
              </FormField>
              <FormField label="Password Admin">
                <Input type="password" value={form.password} onChange={set('password')} placeholder="Ubah password..." />
              </FormField>
              <FormField label="Audio Efek Suara">
                <Select value={form.audio} onChange={set('audio')}>
                  <option value="true">Aktif</option>
                  <option value="false">Mati</option>
                </Select>
              </FormField>
            </div>

            {/* Draw background */}
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Latar Layar Pengundian</div>
              <div className="rounded-xl border border-line p-3 flex flex-col gap-3">
                {drawBg ? (
                  <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: '16/5' }}>
                    <img src={drawBg} alt="background" className="w-full h-full object-cover" />
                    <button
                      onClick={() => updateSettings({ drawBg: '' })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ background: 'rgba(0,0,0,.55)', color: '#fff' }}
                      title="Hapus latar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-lg border-2 border-dashed border-line flex items-center justify-center"
                    style={{ aspectRatio: '16/5' }}
                  >
                    <span className="text-xs text-ink-3">Belum ada latar — menggunakan default</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => bgRef.current?.click()}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Gambar
                  </Button>
                  <span className="text-xs text-ink-3">JPG, PNG, WebP · disarankan 1920×1080</span>
                </div>
                <input ref={bgRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
              </div>
            </div>

            {/* Event management */}
            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Kelola Undian</div>
              <div className="rounded-xl border border-line overflow-hidden">
                {events.map((ev, i) => (
                  <div
                    key={ev.id}
                    className={`px-4 py-3 flex flex-col gap-2 ${i > 0 ? 'border-t border-line' : ''} ${ev.id === activeEventId ? 'bg-yellow-tint/60' : 'bg-white'}`}
                  >
                    {editingId === ev.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="px-2.5 py-1.5 text-sm rounded-lg border border-line focus:outline-none focus:ring-1 focus:ring-yellow"
                          placeholder="Nama undian"
                        />
                        <input
                          value={editPeriod}
                          onChange={e => setEditPeriod(e.target.value)}
                          className="px-2.5 py-1.5 text-sm rounded-lg border border-line focus:outline-none focus:ring-1 focus:ring-yellow"
                          placeholder="Periode"
                        />
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="px-3 py-1 rounded-lg text-xs font-semibold text-white transition-colors" style={{ background: 'var(--ink)' }}>Simpan</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded-lg text-xs font-medium text-ink-3 hover:bg-cream border border-line transition-colors">Batal</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-ink truncate">{ev.name}</span>
                            {ev.id === activeEventId && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--yellow)', color: 'var(--ink)' }}>Aktif</span>
                            )}
                          </div>
                          <div className="text-xs text-ink-3 mt-0.5">
                            {ev.period} · {ev.rekening.length} rekening · {ev.grades.length} grade · {ev.hadiah.length} hadiah
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => startEdit(ev.id)} className="p-1.5 rounded-md hover:bg-cream text-ink-3 hover:text-ink transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            disabled={events.length <= 1}
                            className="p-1.5 rounded-md hover:bg-red/10 text-ink-3 hover:text-red transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={events.length <= 1 ? 'Tidak bisa menghapus undian terakhir' : 'Hapus undian'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Dangerous zone */}
            <div
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{ border: '1px solid var(--line)', background: 'var(--cream)' }}
            >
              <div className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Zona Berbahaya</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink">Export Backup</div>
                    <div className="text-xs text-ink-3">Unduh semua data semua undian sebagai JSON</div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleExportBackup}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-ink">Import Backup</div>
                    <div className="text-xs text-ink-3">Pulihkan data dari file backup</div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => importRef.current?.click()}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import
                  </Button>
                  <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                </div>
                <div className="border-t border-line pt-2">
                  <button
                    onClick={handleReset}
                    className="text-sm font-medium text-red hover:text-red-deep transition-colors"
                  >
                    Reset Data Undian Aktif...
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line shrink-0">
            <Button variant="ghost" size="md" onClick={onClose}>Batal</Button>
            <Button variant="primary" size="md" onClick={handleSave}>Simpan</Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
