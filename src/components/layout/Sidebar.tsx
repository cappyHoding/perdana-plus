import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const SETUP_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: '/rekening',
    label: 'Data Rekening',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    path: '/grade',
    label: 'Grade Hadiah',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    path: '/hadiah',
    label: 'Daftar Hadiah',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
];

const EVENT_ITEMS: NavItem[] = [
  {
    path: '/riwayat',
    label: 'Riwayat Undian',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    path: '/draw',
    label: 'Mulai Pengundian',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function SideNavItem({ item }: { item: NavItem }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === item.path ||
    (item.path === '/dashboard' && location.pathname === '/');

  return (
    <button
      onClick={() => navigate(item.path)}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-all',
        isActive
          ? 'bg-yellow-tint text-ink font-medium'
          : 'text-ink-2 hover:bg-cream hover:text-ink',
      ].join(' ')}
    >
      <span className={isActive ? 'text-red' : 'text-ink-3'}>{item.icon}</span>
      {item.label}
    </button>
  );
}

export default function Sidebar() {
  return (
    <aside
      className="w-[240px] bg-white border-r border-line flex flex-col"
      style={{ minHeight: 'calc(100vh - 71px)' }}
    >
      <div className="flex-1 px-3 py-4">
        {/* Setup section */}
        <div className="mb-4">
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-3">
            Setup
          </div>
          <div className="flex flex-col gap-0.5">
            {SETUP_ITEMS.map(item => (
              <SideNavItem key={item.path} item={item} />
            ))}
          </div>
        </div>

        {/* Event section */}
        <div className="mb-4">
          <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-ink-3">
            Event
          </div>
          <div className="flex flex-col gap-0.5">
            {EVENT_ITEMS.map(item => (
              <SideNavItem key={item.path} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Tip card */}
      <div className="px-3 pb-4">
        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}
        >
          <div className="text-xs font-semibold text-ink mb-1">Aturan Poin</div>
          <div className="text-[11px] text-ink-2 leading-relaxed">
            Poin dihitung per rekening:<br />
            <strong>Saldo × Hari ÷ 100.000</strong><br />
            Atau jika ada mutasi harian,<br />
            dijumlahkan tiap hari.
          </div>
        </div>
      </div>
    </aside>
  );
}
