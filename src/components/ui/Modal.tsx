import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from './Button';

interface ModalConfig {
  title: string;
  body: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  onClose?: () => void;
}

interface ModalContextValue {
  openModal: (cfg: ModalConfig) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue>({
  openModal: () => {},
  closeModal: () => {},
});

export function useModal() {
  return useContext(ModalContext);
}

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const openModal = useCallback((cfg: ModalConfig) => {
    setModal(cfg);
  }, []);

  const closeModal = useCallback(() => {
    setModal(prev => {
      prev?.onClose?.();
      return null;
    });
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(44,42,41,.42)', backdropFilter: 'blur(2px)' }}
              onClick={closeModal}
            />
            {/* Card */}
            <motion.div
              className="relative bg-white rounded-2xl shadow-lg flex flex-col overflow-hidden"
              style={{
                width: '100%',
                maxWidth: modal.maxWidth || '640px',
                maxHeight: '90vh',
              }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
                <h2 className="text-base font-semibold text-ink">{modal.title}</h2>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream text-ink-3 hover:text-ink transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {modal.body}
              </div>
              {/* Footer */}
              {modal.footer && (
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-line shrink-0">
                  {modal.footer}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

// Convenient modal footer
interface ModalFooterProps {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
  saveDisabled?: boolean;
  dangerSave?: boolean;
}

export function ModalFooter({ onCancel, onSave, saveLabel = 'Simpan', saving, saveDisabled, dangerSave }: ModalFooterProps) {
  return (
    <>
      <Button variant="ghost" size="md" onClick={onCancel}>Batal</Button>
      <Button
        variant={dangerSave ? 'danger' : 'primary'}
        size="md"
        onClick={onSave}
        loading={saving}
        disabled={saveDisabled}
      >
        {saveLabel}
      </Button>
    </>
  );
}
