export interface Mutation {
  date: string;
  balance: number;
}

export interface Rekening {
  id: string;
  cif: string;
  accNo: string;
  name: string;
  branch: string;
  balance: number;
  days: number;
  mutations?: Mutation[];
}

export interface Grade {
  id: string;
  name: string;
  desc: string;
  minPoints: number;
  minBalance: number;
}

export interface Hadiah {
  id: string;
  order: number;
  gradeId: string;
  name: string;
  note: string;
  value: number;
  qty: number;
  photo: string;
}

export interface Winner {
  ts: number;
  customerKey: string;
  cif: string;
  accNo: string;
  name: string;
  branch: string;
  points: number;
  gradeName: string;
  gradeId: string;
  prizeName: string;
  prizeId: string;
  prizeValue: number;
}

export interface Customer {
  key: string;
  cif: string;
  name: string;
  branch: string;
  accounts: Rekening[];
  totalPoints: number;
  totalBalance: number;
  totalLastBalance: number;
  displayAccount?: Rekening;
  displayAccNo: string;
}

export interface AppState {
  period: string;
  password: string;
  audio: boolean;
  rekening: Rekening[];
  grades: Grade[];
  hadiah: Hadiah[];
  history: Winner[];
}
