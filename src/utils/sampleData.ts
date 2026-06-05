import type { Grade, Hadiah, Rekening } from '../types';
import { uid } from './helpers';

export function sampleGrades(): Grade[] {
  return [
    { id: uid(), name: 'Grade A', desc: 'Nasabah prioritas utama', minPoints: 600, minBalance: 5000000 },
    { id: uid(), name: 'Grade B', desc: 'Nasabah aktif menengah', minPoints: 300, minBalance: 2000000 },
    { id: uid(), name: 'Grade C', desc: 'Nasabah umum', minPoints: 200, minBalance: 0 },
  ];
}

export function sampleHadiah(grades: Grade[]): Hadiah[] {
  const gradeA = grades.find(g => g.name === 'Grade A')!;
  const gradeB = grades.find(g => g.name === 'Grade B')!;
  const gradeC = grades.find(g => g.name === 'Grade C')!;
  return [
    { id: uid(), order: 1, gradeId: gradeC.id, name: 'Voucher Belanja', note: 'Senilai Rp 500.000', value: 500000, qty: 3, photo: '' },
    { id: uid(), order: 2, gradeId: gradeC.id, name: 'Rice Cooker Miyako', note: '', value: 450000, qty: 2, photo: '' },
    { id: uid(), order: 3, gradeId: gradeB.id, name: 'Mesin Cuci LG', note: '', value: 3000000, qty: 2, photo: '' },
    { id: uid(), order: 4, gradeId: gradeB.id, name: 'Smart TV 43"', note: '', value: 4500000, qty: 2, photo: '' },
    { id: uid(), order: 5, gradeId: gradeA.id, name: 'Kulkas 2 Pintu Sharp', note: '', value: 5500000, qty: 2, photo: '' },
    { id: uid(), order: 6, gradeId: gradeA.id, name: 'Sepeda Motor Honda Beat', note: 'Grand Prize · On the road', value: 18000000, qty: 1, photo: '' },
  ];
}

export function sampleRekening(): Rekening[] {
  const branches = ['Cabang Utama', 'Cabang Selatan', 'Cabang Timur', 'Cabang Barat', 'Cabang Utara'];
  const names = [
    'Budi Santoso', 'Siti Rahayu', 'Ahmad Fauzi', 'Dewi Lestari', 'Rizky Pratama',
    'Nur Hidayah', 'Eko Wahyudi', 'Fitri Handayani', 'Agus Susanto', 'Rina Wulandari',
    'Hendra Gunawan', 'Maya Sari', 'Doni Kurniawan', 'Lina Marlina', 'Rudi Hermawan',
    'Sari Oktaviani', 'Wahyu Setiawan', 'Nita Ratnasari', 'Fajar Nugroho', 'Yuni Astuti',
    'Dedy Cahyono', 'Putri Rahayu', 'Bambang Irawan', 'Ayu Permatasari', 'Tono Wibowo',
    'Indah Permata', 'Andi Saputra', 'Wati Sulistiowati', 'Heri Purnomo', 'Siska Amelia',
  ];

  const reks: Rekening[] = [];
  let accNum = 10000022451;

  // 30 customers, most have 1 account; customers 0 and 9 have 2, customer 3 has 3
  for (let i = 0; i < 30; i++) {
    const cif = `CIF${String(1000 + i).padStart(6, '0')}`;
    const name = names[i];
    const branch = branches[i % branches.length];
    const accountCount = (i === 0 || i === 9) ? 2 : (i === 3 ? 3 : 1);
    for (let j = 0; j < accountCount; j++) {
      const balance = 500000 + Math.floor(Math.random() * 15000000);
      const days = 30 + Math.floor(Math.random() * 335);
      reks.push({
        id: uid(),
        cif,
        accNo: String(accNum++),
        name,
        branch,
        balance,
        days,
      });
    }
  }
  return reks;
}
