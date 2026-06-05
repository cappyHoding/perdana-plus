import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Topbar />
      <div className="flex flex-1" style={{ minHeight: 'calc(100vh - 71px)' }}>
        <Sidebar />
        <main
          className="flex-1 overflow-auto"
          style={{
            background: 'var(--cream)',
            padding: '28px 32px 60px',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
