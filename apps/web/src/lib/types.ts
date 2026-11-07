export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER';
export type StartupStatus = 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'ARCHIVED';
export type FinanceTransactionType = 'INCOME' | 'EXPENSE' | 'FUNDING';
export type FinanceTransactionStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';
export type FinanceCategory =
  | 'SALES' | 'SERVICES' | 'GRANT' | 'INVESTMENT' | 'LOAN' | 'EQUIPMENT' | 'SOFTWARE'
  | 'MARKETING' | 'SALARY' | 'RENT' | 'OPERATIONS' | 'TAX' | 'TRAVEL' | 'OTHER';
export type FundingRoundType = 'BOOTSTRAP' | 'GRANT' | 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'OTHER';
export type FundingRoundStatus = 'PLANNED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type MilestoneStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
export type MilestonePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: Role;
  organizationId: string;
  lastLoginAt?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export interface Stage {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  isActive: boolean;
  _count?: { startups: number };
}

export interface TeamMember {
  id?: string;
  fullName: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  isFounder?: boolean;
}

export interface Startup {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  problem?: string | null;
  solution?: string | null;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  teamSize?: number | null;
  foundedAt?: string | null;
  joinedAt: string;
  logoUrl?: string | null;
  pitchDeckUrl?: string | null;
  status: StartupStatus;
  currentStageId: string;
  currentStage: Stage;
  curatorId?: string | null;
  curator?: { id: string; fullName: string; email?: string; avatarUrl?: string | null } | null;
  members?: TeamMember[];
  notes?: StartupNote[];
  stageHistory?: StageHistory[];
  createdAt: string;
  updatedAt: string;
  files?: StartupDocument[];
  _count?: { members: number; notes: number };
}

export interface StartupDocument {
  id: string;
  name: string;
  contentType: string;
  size: number;
  createdAt: string;
  uploader?: { id: string; fullName: string } | null;
}

export interface StartupNote {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; fullName: string; avatarUrl?: string | null };
}

export interface StageHistory {
  id: string;
  note?: string | null;
  createdAt: string;
  fromStage?: Stage | null;
  toStage: Stage;
  changedBy: { id: string; fullName: string };
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  role: Role;
}

export interface FinanceProfile {
  startupId: string;
  baseCurrency: string;
  openingBalance: number | string;
  budgetAmount?: number | string | null;
  budgetStartDate?: string | null;
  budgetEndDate?: string | null;
  notes?: string | null;
}

export interface FinanceTransaction {
  id: string;
  type: FinanceTransactionType;
  category: FinanceCategory;
  status: FinanceTransactionStatus;
  title: string;
  amount: number | string;
  currency: string;
  exchangeRate: number | string;
  baseAmount: number | string;
  counterparty?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  occurredAt: string;
  receiptUrl?: string | null;
  notes?: string | null;
  fundingRoundId?: string | null;
  fundingRound?: { id: string; name: string } | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface FundingRound {
  id: string;
  type: FundingRoundType;
  status: FundingRoundStatus;
  name: string;
  targetAmount?: number | string | null;
  raisedAmount: number | string;
  currency: string;
  exchangeRate: number | string;
  baseRaisedAmount: number | string;
  preMoneyValuation?: number | string | null;
  postMoneyValuation?: number | string | null;
  equityPercent?: number | string | null;
  investorName?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  notes?: string | null;
}

export interface FinanceOverview {
  profile: FinanceProfile;
  summary: {
    baseCurrency: string;
    openingBalance: number;
    income: number;
    funding: number;
    expenses: number;
    cashBalance: number;
    monthlyBurn: number;
    runwayMonths: number | null;
    monthIncome: number;
    monthExpense: number;
    budgetAmount: number | null;
    budgetSpent: number;
    budgetRemaining: number | null;
    expenseByCategory: { category: FinanceCategory; amount: number }[];
  };
  transactions: FinanceTransaction[];
  fundingRounds: FundingRound[];
}

export interface Milestone {
  id: string;
  title: string;
  description?: string | null;
  status: MilestoneStatus;
  priority: MilestonePriority;
  dueDate?: string | null;
  completedAt?: string | null;
  assigneeId?: string | null;
  assignee?: { id: string; fullName: string; avatarUrl?: string | null } | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}
