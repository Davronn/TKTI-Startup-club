import { OrganizationRole } from '@prisma/client';

export interface AuthUser {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  email: string;
  fullName: string;
}

export interface AccessTokenPayload {
  sub: string;
  organizationId: string;
  role: OrganizationRole;
  email: string;
  fullName: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}
