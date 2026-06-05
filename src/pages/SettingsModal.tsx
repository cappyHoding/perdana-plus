import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import Button from '../components/ui/Button';
import FormField, { Input, Select } from '../components/ui/FormField';
import type { AppState } from '../types';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { period, password, audio, updateSettings, resetAll, importState } = useAppStore(s => ({
    period: s.period,
    password: s.password,
    audio: s.audio,
    updateSettings: s.updateSettings,
    resetAll: s.resetAll,
    importState: s.importState,
  }));

  const importRef = useRef<HTMLInputElement>(null);

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
    const data: Partial<AppState> = {
      period: state.period,
      password: state.password,
      audio: state.audio,
      rekening: state.rekening,
      grades: state.grades,
      hadiah: state.hadiah,
      history: state.history,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
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
    if (!confirm('PERINGATAN: Ini akan menghapus semua data termasuk rekening, grade, hadiah, dan riwayat. Tindakan ini tidak dapat dibatalkan.\n\nKetuk OK untuk melanjutkan.')) return;
    if (!confirm('Yakin? Semua data akan dihapus permanen.')) return;
    resetAll();
    onClose();
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
          style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh' }}
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
            {/* Basic settings */}
            <div className="flex flex-col gap-4">
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
                    <div className="text-xs text-ink-3">Unduh semua data sebagai JSON</div>
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
                    Reset Semua Data...
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
