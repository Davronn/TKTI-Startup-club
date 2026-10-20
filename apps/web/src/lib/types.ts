export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'VIEWER';
export type StartupStatus = 'ACTIVE' | 'PAUSED' | 'GRADUATED' | 'ARCHIVED';

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
  _count?: { members: number; notes: number };
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
