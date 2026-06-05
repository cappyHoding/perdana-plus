import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ModalProvider } from './components/ui/Modal';
import ToastContainer from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RekeningPage from './pages/RekeningPage';
import GradePage from './pages/GradePage';
import HadiahPage from './pages/HadiahPage';
import RiwayatPage from './pages/RiwayatPage';
import DrawPage from './pages/DrawPage';

function AppContent() {
  const { toasts, push, dismiss } = useToast();

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Admin layout routes */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/rekening" element={<RekeningPage />} />
          <Route path="/grade" element={<GradePage />} />
          <Route path="/hadiah" element={<HadiahPage />} />
          <Route path="/riwayat" element={<RiwayatPage />} />
        </Route>

        {/* Draw page — protected but no sidebar */}
        <Route
          path="/draw"
          element={
            <ProtectedRoute>
              <DrawPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </BrowserRouter>
  );
}
