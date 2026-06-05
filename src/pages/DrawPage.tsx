import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import Topbar from '../components/layout/Topbar';
import {
  getOrderedHadiah,
  eligibleCustomersFor,
  maskAcc,
  fmt,
  fmtRp,
} from '../utils/helpers';
import { drumrollStart, lockSound, fanfare } from '../utils/audio';
import type { Grade, Hadiah, Winner, Customer } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DrawSlot {
  hadiah: Hadiah;
  grade: Grade;
  slotIx: number;
  slotTotal: number;
}

interface DrawSession {
  slots: DrawSlot[];
  curIx: number;
  sessionWinners: Winner[];
}

function buildSession(hadiah: Hadiah[], grades: Grade[]): DrawSession {
  const slots: DrawSlot[] = [];
  getOrderedHadiah(hadiah).forEach(h => {
    const g = grades.find(x => x.id === h.gradeId);
    if (!g) return;
    for (let i = 0; i < (h.qty || 1); i++) {
      slots.push({ hadiah: h, grade: g, slotIx: i + 1, slotTotal: h.qty || 1 });
    }
  });
  return { slots, curIx: 0, sessionWinners: [] };
}

// ─── Confetti ────────────────────────────────────────────────────────────────

interface ConfettiParticle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; rot: number; rotV: number;
}

const CONFETTI_COLORS = ['#F5C518', '#D8233E', '#1F8A5B', '#4B4845', '#FFE082', '#B01A30'];

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ConfettiParticle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = Array.from({ length: 70 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.8) * 20,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
    }));

    const start = performance.now();
    const DURATION = 1600;

    function animate(now: number) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5; // gravity
        p.rot += p.rotV;
        const alpha = Math.max(0, 1 - elapsed / DURATION);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
      if (elapsed < DURATION) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[110]"
    />
  );
}

// ─── Digit Reel ──────────────────────────────────────────────────────────────

const CYCLES = 8;
const DIGITS = '0123456789';

function getDigitHeight(): number {
  // Read actual rendered height from DOM to handle responsive CSS (@media max-height: 820px → 68px)
  const el = document.querySelector('.digit');
  return el ? (el as HTMLElement).offsetHeight || 78 : 78;
}

interface ReelDigitRef {
  rollEl: HTMLDivElement | null;
  targetDigit: string;
}

// ─── Main DrawPage ────────────────────────────────────────────────────────────

export default function DrawPage() {
  const { rekening, grades, hadiah, history, addWinner, audio, period } = useAppStore(s => ({
    rekening: s.rekening,
    grades: s.grades,
    hadiah: s.hadiah,
    history: s.history,
    addWinner: s.addWinner,
    audio: s.audio,
    period: s.period,
  }));

  const navigate = useNavigate();

  // ── Session state ──
  const sessionRef = useRef<DrawSession | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0); // force re-render
  const reRender = () => setSessionVersion(v => v + 1);

  // ── Spin state ──
  const [spinning, setSpinning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [candidate, setCandidate] = useState<Customer | null>(null);
  const stopRequestedRef = useRef(false);
  const drumrollStopRef = useRef<(() => void) | null>(null);
  const rafRef = useRef<number>(0);

  // ── Reel refs ──
  const digitRefs = useRef<ReelDigitRef[]>(
    Array.from({ length: 11 }, () => ({ rollEl: null, targetDigit: '0' }))
  );
  const rollContainerRefs = useRef<(HTMLDivElement | null)[]>(Array(11).fill(null));

  // ── UI state ──
  const [revealWinner, setRevealWinner] = useState<Winner | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Build/get session — rebuild whenever hadiah/grades change and draw hasn't started
  useEffect(() => {
    const s = sessionRef.current;
    const notStarted = !s || (s.curIx === 0 && s.sessionWinners.length === 0);
    if (notStarted) {
      sessionRef.current = buildSession(hadiah, grades);
      reRender();
    }
  }, [hadiah, grades]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sessionRef.current) {
    sessionRef.current = buildSession(hadiah, grades);
  }
  const session = sessionRef.current;
  const curSlot = session.slots[session.curIx] ?? null;
  const totalSlots = session.slots.length;
  const isComplete = session.curIx >= totalSlots;

  // ── Fullscreen ──
  useEffect(() => {
    const onFsChange = () => {
      const isFull = !!document.fullscreenElement;
      setFullscreen(isFull);
      if (isFull) document.body.classList.add('fs');
      else document.body.classList.remove('fs');
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.body.classList.remove('fs');
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // ── Spin logic ──
  // Active spinning positions: 0,7,8,9,10 (real digits)
  const ACTIVE_POSITIONS = [0, 7, 8, 9, 10];
  const MASK_POSITIONS = [1, 2, 3, 4, 5, 6];

  const startSpin = useCallback(() => {
    if (!curSlot || spinning) return;

    // Pick winner
    const allWinnerKeys = new Set([
      ...history.map(w => w.customerKey),
      ...session.sessionWinners.map(w => w.customerKey),
    ]);
    const eligibles = eligibleCustomersFor(curSlot.grade, rekening).filter(c => !allWinnerKeys.has(c.key));

    if (!eligibles.length) {
      alert(`Tidak ada nasabah eligible tersisa untuk ${curSlot.grade.name}`);
      return;
    }

    const winner = eligibles[Math.floor(Math.random() * eligibles.length)];
    setCandidate(winner);
    setSpinning(true);
    setStopped(false);
    stopRequestedRef.current = false;

    if (audio) {
      drumrollStopRef.current = drumrollStart();
    }

    const digitH = getDigitHeight();
    const accNo = winner.displayAccNo.padStart(11, '0');

    // Initialize rolls for active positions
    ACTIVE_POSITIONS.forEach(pos => {
      const el = rollContainerRefs.current[pos];
      if (!el) return;
      // Build 80 spans (8 cycles × 10) + target
      el.innerHTML = '';
      const totalSpans = CYCLES * 10 + 1;
      for (let i = 0; i < totalSpans; i++) {
        const span = document.createElement('span');
        span.textContent = DIGITS[i % 10];
        el.appendChild(span);
      }
      // Start at position 0
      el.style.transition = 'none';
      el.style.transform = 'translateY(0px)';
      digitRefs.current[pos].targetDigit = accNo[pos] ?? '0';
    });

    // Animation loop
    let startTime: number | null = null;
    const BASE_SPEED = 22; // ms per digit height

    const animate = (ts: number) => {
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      const speedFactor = Math.min(1, elapsed / 600); // ramp up over 600ms

      if (!stopRequestedRef.current) {
        ACTIVE_POSITIONS.forEach(pos => {
          const el = rollContainerRefs.current[pos];
          if (!el) return;
          const speed = BASE_SPEED / (0.4 + speedFactor * 0.6);
          const pos_px = (elapsed / speed) % (10 * digitH);
          el.style.transition = 'none';
          el.style.transform = `translateY(-${pos_px}px)`;
        });
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Stop: snap to target digits simultaneously
        cancelAnimationFrame(rafRef.current);

        ACTIVE_POSITIONS.forEach(pos => {
          const el = rollContainerRefs.current[pos];
          if (!el) return;
          const target = digitRefs.current[pos].targetDigit;
          const targetIndex = parseInt(target, 10);
          const totalSpans = CYCLES * 10;
          // Find the last occurrence of target in the roll
          const targetRow = (CYCLES - 1) * 10 + targetIndex;
          const targetY = targetRow * digitH;
          el.style.transition = 'transform 700ms cubic-bezier(.12,.7,.18,1)';
          el.style.transform = `translateY(-${targetY}px)`;
        });

        setTimeout(() => {
          // Lock glow
          ACTIVE_POSITIONS.forEach(pos => {
            const parent = rollContainerRefs.current[pos]?.parentElement;
            if (parent) parent.classList.add('locked');
          });
          if (audio) lockSound();
          setStopped(true);
        }, 720);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [curSlot, spinning, audio, rekening, grades, history, session]);

  const requestStop = useCallback(() => {
    if (!spinning || stopped) return;
    stopRequestedRef.current = true;
    if (drumrollStopRef.current) {
      drumrollStopRef.current();
      drumrollStopRef.current = null;
    }
  }, [spinning, stopped]);

  const handleConfirm = useCallback(() => {
    if (!stopped || !candidate || !curSlot) return;

    const winner: Winner = {
      ts: Date.now(),
      customerKey: candidate.key,
      cif: candidate.cif,
      accNo: candidate.displayAccNo,
      name: candidate.name,
      branch: candidate.branch,
      points: candidate.totalPoints,
      gradeName: curSlot.grade.name,
      gradeId: curSlot.grade.id,
      prizeName: curSlot.hadiah.name,
      prizeId: curSlot.hadiah.id,
      prizeValue: curSlot.hadiah.value,
    };

    addWinner(winner);
    session.sessionWinners.push(winner);

    if (audio) fanfare();
    setRevealWinner(winner);

    // Advance session
    session.curIx++;
    setSpinning(false);
    setStopped(false);
    setCandidate(null);

    // Reset digit displays
    ACTIVE_POSITIONS.forEach(pos => {
      const parent = rollContainerRefs.current[pos]?.parentElement;
      if (parent) parent.classList.remove('locked');
      const el = rollContainerRefs.current[pos];
      if (el) {
        el.style.transition = 'none';
        el.style.transform = 'translateY(0px)';
        el.innerHTML = '<span>—</span>';
      }
    });

    reRender();
  }, [stopped, candidate, curSlot, addWinner, session, audio]);

  const handleSkip = useCallback(() => {
    if (spinning && !stopped) return;
    if (!curSlot) return;
    if (!confirm(`Lewati hadiah "${curSlot.hadiah.name}" unit ${curSlot.slotIx}/${curSlot.slotTotal}?`)) return;
    session.curIx++;
    setSpinning(false);
    setStopped(false);
    setCandidate(null);
    ACTIVE_POSITIONS.forEach(pos => {
      const parent = rollContainerRefs.current[pos]?.parentElement;
      if (parent) parent.classList.remove('locked');
    });
    reRender();
  }, [spinning, stopped, curSlot, session]);

  const closeReveal = useCallback(() => {
    setRevealWinner(null);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!spinning) startSpin();
        else if (!stopped) requestStop();
      }
      if (e.code === 'Enter') {
        e.preventDefault();
        if (revealWinner) closeReveal();
        else if (stopped && candidate) handleConfirm();
      }
      if (e.code === 'Escape') {
        if (revealWinner) closeReveal();
      }
      if (e.code === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spinning, stopped, candidate, revealWinner, startSpin, requestStop, handleConfirm, closeReveal]);

  // ── Empty state check ──
  const isEmpty = rekening.length === 0 || grades.length === 0 || hadiah.length === 0;
  // Guard: data exists but no prize has a valid matching grade (e.g. corrupted localStorage)
  const hasNoValidSlots = !isEmpty && totalSlots === 0;

  // ── Render helpers ──
  const setRollRef = (pos: number) => (el: HTMLDivElement | null) => {
    rollContainerRefs.current[pos] = el;
  };

  const accNoDisplay = candidate?.displayAccNo ?? '           ';

  return (
    <div
      className="draw-page flex flex-col"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(1400px 800px at 50% -10%, #FFE082 0%, #F5C518 35%, #E5B400 100%)',
      }}
    >
      <Topbar onOpenSettings={() => setSettingsOpen(true)} />

      <div className="flex-1 flex flex-col items-center px-7 py-4">
        <div className="w-full flex flex-col gap-3.5" style={{ maxWidth: '1500px' }}>

          {/* ── Draw Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-2 mb-0.5">
                Pengundian Hadiah Tahunan
              </div>
              <h1 className="text-2xl font-extrabold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
                Tabungan Perdana <em className="not-italic text-red">Plus</em>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Progress */}
              <div
                className="px-3 py-1.5 rounded-full text-sm font-bold"
                style={{ background: 'var(--ink)', color: 'var(--yellow)' }}
              >
                {session.curIx + 1}/{totalSlots || 1}
              </div>

              {/* Audio toggle */}
              <button
                onClick={() => useAppStore.getState().updateSettings({ audio: !audio })}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/40 text-ink transition-colors"
                title={audio ? 'Matikan audio' : 'Aktifkan audio'}
              >
                {audio ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m0 0l-3-3m3 3l3-3M3 10v4a1 1 0 001 1h3l5 5V4L7 9H4a1 1 0 00-1 1z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                )}
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/40 text-ink transition-colors"
                title="Fullscreen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>

              {/* Period chip */}
              <div
                className="px-3 py-1.5 rounded-xl text-xs font-medium"
                style={{ background: 'var(--ink)', color: 'var(--yellow-soft)' }}
              >
                {period}
              </div>
            </div>
          </div>

          {/* ── No valid slots (grade ID mismatch / misconfigured) ── */}
          {hasNoValidSlots && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(255,255,255,.85)', border: '2px dashed var(--yellow)', boxShadow: 'var(--shadow-md)' }}
            >
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-base font-semibold text-ink mb-1">Hadiah tidak terhubung ke grade</div>
              <div className="text-sm text-ink-2 mb-4">
                Semua hadiah yang terdaftar tidak memiliki grade yang valid. Silakan reset data dan muat ulang, atau periksa pengaturan grade di setiap hadiah.
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                <button onClick={() => navigate('/hadiah')} className="px-4 py-2 bg-ink text-white text-sm rounded-xl hover:opacity-90 transition">
                  Cek Daftar Hadiah
                </button>
                <button onClick={() => navigate('/grade')} className="px-4 py-2 border border-ink text-ink text-sm rounded-xl hover:bg-white/50 transition">
                  Cek Grade
                </button>
              </div>
            </div>
          )}

          {/* ── Empty state ── */}
          {isEmpty && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(255,255,255,.85)', border: '2px dashed var(--yellow)', boxShadow: 'var(--shadow-md)' }}
            >
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-base font-semibold text-ink mb-1">Data belum lengkap</div>
              <div className="text-sm text-ink-2 mb-4">
                Untuk memulai pengundian, pastikan data rekening, grade, dan hadiah sudah diisi.
              </div>
              <div className="flex justify-center gap-2 flex-wrap">
                <button onClick={() => navigate('/rekening')} className="px-4 py-2 bg-ink text-white text-sm rounded-xl hover:opacity-90 transition">
                  Data Rekening
                </button>
                <button onClick={() => navigate('/grade')} className="px-4 py-2 bg-ink text-white text-sm rounded-xl hover:opacity-90 transition">
                  Grade Hadiah
                </button>
                <button onClick={() => navigate('/hadiah')} className="px-4 py-2 bg-ink text-white text-sm rounded-xl hover:opacity-90 transition">
                  Daftar Hadiah
                </button>
              </div>
            </div>
          )}

          {/* ── Big Stage ── */}
          {!isEmpty && !isComplete && curSlot && (
            <div
              className="rounded-2xl"
              style={{
                background: '#fff',
                border: '1px solid #E5B400',
                boxShadow: 'var(--shadow-lg)',
                padding: '18px 26px 20px',
              }}
            >
              <div className="grid gap-6" style={{ gridTemplateColumns: '240px 1fr' }}>
                {/* Photo */}
                <div
                  className="rounded-xl overflow-hidden flex items-center justify-center"
                  style={{
                    aspectRatio: '1/1',
                    background: 'linear-gradient(135deg, var(--yellow-tint), var(--yellow-soft))',
                  }}
                >
                  {curSlot.hadiah.photo ? (
                    <img src={curSlot.hadiah.photo} alt={curSlot.hadiah.name} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-20 h-20 text-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">
                    Hadiah ke-{session.curIx + 1} dari {totalSlots} · unit {curSlot.slotIx}/{curSlot.slotTotal}
                  </div>
                  <h2
                    className="font-extrabold leading-tight"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '38px',
                      fontWeight: 800,
                      color: 'var(--ink)',
                    }}
                  >
                    {curSlot.hadiah.name}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xl font-bold text-red">{fmtRp(curSlot.hadiah.value)}</span>
                    {curSlot.hadiah.note && (
                      <span className="text-sm text-ink-3">{curSlot.hadiah.note}</span>
                    )}
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: 'var(--yellow-tint)', border: '1px solid var(--yellow-soft)' }}
                    >
                      {curSlot.grade.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Complete state ── */}
          {!isEmpty && !hasNoValidSlots && isComplete && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(255,255,255,.9)', border: '2px solid var(--yellow)', boxShadow: 'var(--shadow-lg)' }}
            >
              <div className="text-4xl mb-3">🎉</div>
              <div
                className="text-2xl font-extrabold text-ink mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Pengundian Selesai!
              </div>
              <div className="text-sm text-ink-2 mb-4">
                Semua {totalSlots} hadiah telah diundi. Lihat riwayat untuk detail pemenang.
              </div>
              <div className="flex justify-center gap-3">
                <button onClick={() => navigate('/riwayat')} className="px-5 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
                  Lihat Riwayat
                </button>
                <button
                  onClick={() => {
                    sessionRef.current = buildSession(hadiah, grades);
                    reRender();
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-line hover:bg-cream transition"
                >
                  Mulai Ulang Sesi
                </button>
              </div>
            </div>
          )}

          {/* ── Reel Section ── */}
          {!isEmpty && !isComplete && curSlot && (
            <div
              className="rounded-2xl"
              style={{
                background: 'linear-gradient(160deg, #1a1817, var(--ink))',
                border: '2px solid #E5B400',
                borderRadius: '16px',
                padding: '16px 18px 18px',
              }}
            >
              {/* Label */}
              <div
                className="text-[11px] font-semibold uppercase tracking-widest mb-3 text-center"
                style={{ color: 'var(--yellow)' }}
              >
                Nomor Rekening Pemenang
              </div>

              {/* Digit cells */}
              <div className="flex items-center justify-center gap-1.5 mb-3">
                {Array.from({ length: 11 }, (_, i) => {
                  const isActive = ACTIVE_POSITIONS.includes(i);
                  const isMask = MASK_POSITIONS.includes(i);
                  return (
                    <div key={i} className={`digit ${isMask ? 'mask' : ''}`}>
                      {isMask ? (
                        <span>*</span>
                      ) : (
                        <div className="roll" ref={setRollRef(i)}>
                          <span>—</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Name plate */}
              <div
                className="mx-auto rounded-xl px-5 py-3 text-center max-w-sm"
                style={{ border: '1px solid var(--yellow-tint)', background: 'rgba(255,246,208,.08)' }}
              >
                {stopped && candidate ? (
                  <>
                    <div className="text-white font-semibold text-base" style={{ fontFamily: 'var(--font-display)' }}>
                      {candidate.name}
                    </div>
                    <div className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(245,197,24,.65)' }}>
                      {maskAcc(candidate.displayAccNo)} · {candidate.branch}
                    </div>
                  </>
                ) : spinning ? (
                  <div className="text-sm" style={{ color: 'rgba(245,197,24,.5)' }}>Mengundi...</div>
                ) : (
                  <div className="text-sm" style={{ color: 'rgba(245,197,24,.4)' }}>Tekan Mulai Putar</div>
                )}
              </div>
            </div>
          )}

          {/* ── Controls ── */}
          {!isEmpty && !isComplete && curSlot && (
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {!spinning && (
                <button
                  onClick={startSpin}
                  className="px-8 py-3 rounded-xl font-extrabold text-white text-base transition-all hover:opacity-90 active:scale-95"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'var(--red)',
                    boxShadow: '0 4px 20px rgba(216,35,62,.45)',
                    border: '2px solid var(--red-deep)',
                  }}
                >
                  Mulai Putar
                </button>
              )}
              {spinning && !stopped && (
                <button
                  onClick={requestStop}
                  className="px-8 py-3 rounded-xl font-extrabold text-base transition-all hover:opacity-90 active:scale-95"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'var(--ink)',
                    color: 'var(--yellow)',
                    border: '2px solid rgba(245,197,24,.3)',
                  }}
                >
                  Stop
                </button>
              )}
              <button
                onClick={handleConfirm}
                disabled={!stopped || !candidate}
                className="px-8 py-3 rounded-xl font-extrabold text-white text-base transition-all hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'var(--ink)',
                  border: '2px solid rgba(255,255,255,.15)',
                }}
              >
                Konfirmasi
              </button>
              <button
                onClick={handleSkip}
                disabled={spinning && !stopped}
                className="px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ border: '1.5px solid rgba(44,42,41,.3)', color: 'var(--ink-2)' }}
              >
                Lewati
              </button>
            </div>
          )}

          {/* Keyboard hint */}
          {!isEmpty && !isComplete && (
            <div className="text-center text-xs text-ink-3">
              <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded mr-1">Space</span> Putar/Stop ·
              <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded mx-1">Enter</span> Konfirmasi ·
              <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded mx-1">Esc</span> Tutup overlay ·
              <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded ml-1">F11</span> Fullscreen
            </div>
          )}

        </div>
      </div>

      {/* ── Winners Drawer Tab ── */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
        style={{ top: '50%' }}
      >
        <button
          onClick={() => setDrawerOpen(o => !o)}
          className="flex flex-col items-center justify-center w-9 rounded-l-xl py-4 gap-1.5 transition-all"
          style={{
            background: 'var(--ink)',
            color: 'var(--yellow)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {session.sessionWinners.length > 0 && (
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: 'var(--red)', color: '#fff' }}
            >
              {session.sessionWinners.length}
            </span>
          )}
          <span className="text-[10px] font-semibold" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.05em' }}>
            Pemenang
          </span>
        </button>
      </div>

      {/* ── Winners Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: 'rgba(44,42,41,.2)' }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
              style={{ width: '420px', background: 'var(--paper)', boxShadow: 'var(--shadow-lg)' }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <div className="font-semibold text-ink">Pemenang Sesi Ini</div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-cream text-ink-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {session.sessionWinners.length === 0 ? (
                  <div className="text-center text-sm text-ink-3 py-10">Belum ada pemenang</div>
                ) : (
                  session.sessionWinners.map((w, i) => (
                    <div
                      key={w.ts}
                      className="flex items-center gap-3 p-3 rounded-xl border border-line"
                      style={{ background: 'var(--cream)' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'var(--ink)', color: 'var(--yellow)' }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-ink truncate">{w.name}</div>
                        <div className="text-xs text-ink-3 font-mono">{maskAcc(w.accNo)}</div>
                      </div>
                      <div className="text-xs font-medium text-right shrink-0">
                        <div className="text-ink">{w.prizeName}</div>
                        <div className="text-ink-3">{w.gradeName}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Reveal Overlay ── */}
      <AnimatePresence>
        {revealWinner && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center"
            style={{ background: 'radial-gradient(900px 600px at 50% 30%, #FFE082 0%, #F5C518 50%, #E5B400 100%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Confetti />
            <motion.div
              className="flex flex-col items-center text-center"
              style={{
                background: '#fff',
                border: '3px solid var(--ink)',
                borderRadius: '24px',
                padding: '36px 52px',
                maxWidth: '600px',
                width: '90%',
                boxShadow: 'var(--shadow-lg)',
                position: 'relative',
                zIndex: 1,
              }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="text-sm font-bold text-red uppercase tracking-widest mb-3">★ Pemenang ★</div>
              <h2
                className="font-extrabold text-ink leading-tight mb-2"
                style={{ fontFamily: 'var(--font-display)', fontSize: '52px' }}
              >
                {revealWinner.name}
              </h2>
              <div className="font-mono text-base mb-4" style={{ color: 'var(--ink-3)' }}>
                {maskAcc(revealWinner.accNo)}
              </div>
              <div
                className="px-5 py-2 rounded-full font-bold text-base mb-2"
                style={{ background: 'var(--ink)', color: 'var(--yellow)' }}
              >
                {revealWinner.prizeName}
              </div>
              <div className="text-sm text-ink-3 mb-6">
                {revealWinner.gradeName} · {fmtRp(revealWinner.prizeValue)} · {revealWinner.branch}
              </div>
              <button
                onClick={closeReveal}
                className="px-8 py-3 rounded-xl text-base font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--ink)', fontFamily: 'var(--font-display)' }}
              >
                Lanjutkan
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
