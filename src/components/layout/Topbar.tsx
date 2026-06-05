import React, { useState } from 'react';
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
  const { period, logout } = useAppStore(s => ({
    period: s.period,
    logout: s.logout,
  }));
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSettingsClick = () => {
    if (onOpenSettings) onOpenSettings();
    else setSettingsOpen(true);
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
                Sistem Pengundian · Tabungan Perdana Plus
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
            {/* Period pill */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--yellow)' }}
              />
              {period}
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
