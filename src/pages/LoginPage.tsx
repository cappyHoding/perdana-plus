import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAppStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const ok = login(password);
      if (ok) {
        navigate('/dashboard');
      } else {
        setError('Password salah. Silakan coba lagi.');
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(900px 600px at 50% 30%, #FFE082 0%, #F5C518 50%, #E5B400 100%)' }}
    >
      <div
        className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-5"
        style={{
          width: '100%',
          maxWidth: '420px',
          border: '1px solid #E5B400',
        }}
      >
        {/* Logo mark */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--yellow)' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--red)',
              lineHeight: 1,
            }}
          >
            p
          </span>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            BPR <em className="not-italic text-red">perdana</em>
          </h1>
          <p className="text-sm text-ink-3 mt-1">Sistem Pengundian Tabungan Perdana Plus</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Password Admin</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Masukkan password..."
              autoFocus
              className={[
                'w-full px-3 py-2.5 text-sm rounded-lg border transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-yellow focus:border-yellow',
                error ? 'border-red' : 'border-line',
              ].join(' ')}
            />
            {error && (
              <p className="text-xs text-red mt-1">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className={[
              'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
              'focus:outline-none focus:ring-2 focus:ring-yellow',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'bg-red text-white hover:bg-red-deep',
            ].join(' ')}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        {/* Hint */}
        <p className="text-xs text-ink-3 text-center leading-relaxed">
          Default password: <code className="font-mono bg-cream px-1.5 py-0.5 rounded">perdana2026</code>
          <br />· dapat diubah di pengaturan.
        </p>
      </div>
    </div>
  );
}
