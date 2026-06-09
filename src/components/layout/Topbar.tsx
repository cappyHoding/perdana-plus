import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import SettingsModal from '../../pages/SettingsModal';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/rekening', label: 'Rekening' },
  { path: '/grade', label: 'Grade' },
  { path: '/hadiah', label: 'Hadiah' },
  { path: '/riwayat', label: 'Riwayat' },
  { path: '/draw', label: 'Pengundian', isDraw: true },
];

interface TopbarProps {
  onOpenSettings?: () => void;
}

export default function Topbar({ onOpenSettings }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { period, events, activeEventId, logout, addEvent, switchEvent } = useAppStore(s => ({
    period: s.period,
    events: s.events,
    activeEventId: s.activeEventId,
    logout: s.logout,
    addEvent: s.addEvent,
    switchEvent: s.switchEvent,
  }));

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPeriod, setNewPeriod] = useState('Tahun 2026');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeEvent = events.find(e => e.id === activeEventId);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setAddOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSettingsClick = () => {
    if (onOpenSettings) onOpenSettings();
    else setSettingsOpen(true);
  };

  const handleAddEvent = () => {
    if (!newName.trim()) return;
    addEvent(newName.trim(), newPeriod.trim() || 'Tahun 2026');
    setNewName('');
    setNewPeriod('Tahun 2026');
    setAddOpen(false);
    setDropdownOpen(false);
  };

  return (
    <>
      <div
        className="topbar-shell sticky top-0 z-50 bg-white border-b border-line"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center gap-4 px-5 h-[71px]">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: 'var(--yellow)', fontFamily: 'var(--font-display)', color: 'var(--red)' }}
            >
              p
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight text-ink">
                BPR <em className="not-italic text-red">perdana</em>
              </div>
              <div className="text-[10px] text-ink-3 leading-tight">
                Sistem Pengundian
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1 flex-1 justify-center">
            {NAV_ITEMS.map(item => {
              const isActive = location.pathname === item.path ||
                (item.path === '/dashboard' && location.pathname === '/');
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={[
                    'px-3.5 py-1.5 text-sm rounded-lg transition-all duration-150 font-medium',
                    item.isDraw
                      ? isActive
                        ? 'bg-yellow text-ink'
                        : 'bg-ink text-white hover:bg-ink-2'
                      : isActive
                        ? 'bg-yellow-tint text-red'
                        : 'text-ink-2 hover:bg-cream hover:text-ink',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Event switcher */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => { setDropdownOpen(o => !o); setAddOpen(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors hover:bg-yellow-soft/40"
                style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--yellow)' }} />
                <span className="font-semibold text-ink max-w-[120px] truncate">{activeEvent?.name ?? '—'}</span>
                <span className="text-ink-3">·</span>
                <span className="text-ink-3">{period}</span>
                <svg className="w-3 h-3 text-ink-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 rounded-xl z-50 overflow-hidden"
                  style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: 'var(--shadow-lg)', minWidth: '240px' }}
                >
                  {events.map(e => (
                    <button
                      key={e.id}
                      onClick={() => { switchEvent(e.id); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-cream transition-colors flex items-center gap-2.5"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-0.5"
                        style={{ background: e.id === activeEventId ? 'var(--yellow)' : 'var(--line-2)' }}
                      />
                      <div>
                        <div className={`text-sm ${e.id === activeEventId ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>
                          {e.name}
                        </div>
                        <div className="text-xs text-ink-3">{e.period}</div>
                      </div>
                      {e.id === activeEventId && (
                        <svg className="w-3.5 h-3.5 text-ok ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}

                  <div className="border-t border-line">
                    {!addOpen ? (
                      <button
                        onClick={() => setAddOpen(true)}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium text-ink-3 hover:text-ink hover:bg-cream transition-colors flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Undian Baru
                      </button>
                    ) : (
                      <div className="px-4 py-3 flex flex-col gap-2">
                        <input
                          autoFocus
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddEvent(); if (e.key === 'Escape') setAddOpen(false); }}
                          placeholder="Nama undian..."
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:ring-1 focus:ring-yellow"
                        />
                        <input
                          value={newPeriod}
                          onChange={e => setNewPeriod(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddEvent(); if (e.key === 'Escape') setAddOpen(false); }}
                          placeholder="Periode (Tahun 2026)"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:ring-1 focus:ring-yellow"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={handleAddEvent}
                            disabled={!newName.trim()}
                            className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-colors"
                            style={{ background: 'var(--ink)' }}
                          >
                            Buat
                          </button>
                          <button
                            onClick={() => setAddOpen(false)}
                            className="px-2 py-1.5 rounded-lg text-xs font-medium text-ink-3 hover:bg-cream transition-colors border border-line"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <button
              onClick={handleSettingsClick}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream text-ink-3 hover:text-ink transition-colors"
              title="Pengaturan"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-red/10 text-ink-3 hover:text-red transition-colors border border-transparent hover:border-red/20"
              title="Keluar"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar
            </button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
