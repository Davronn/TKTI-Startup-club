import { OrganizationRole } from '@prisma/client';

export interface AuthUser {
  userId: string;
  sessionId: string;
  organizationId: string;
  role: OrganizationRole;
  email: string;
  fullName: string;
}

export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  organizationId: string;
  role: OrganizationRole;
  email: string;
  fullName: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  organizationId: string;
  type: 'refresh';
}
