import { getCurrentUser } from './auth';
import { User, UserRole, Campaign } from '../types';

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Permission denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Ensures a user is authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError('You must be logged in to perform this action');
  }
  return user;
}

/**
 * Ensures a user has one of the required roles
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Access denied: Required role (${allowedRoles.join(', ')}), but your role is ${user.role}`
    );
  }
  return user;
}

/**
 * Canonical post-login landing route per role
 */
export function roleHome(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'AUDITOR':
      return '/auditor/dashboard';
    case 'ORGANIZATION':
      return '/org/campaigns';
    case 'CONTRACTOR':
      return '/contractor';
    default:
      return '/dashboard';
  }
}

/**
 * Asserts that a user is authorized to manage a specific campaign
 */
export function assertCanManageCampaign(user: User, campaign: { ngo_id: string }): void {
  if (user.role === 'ADMIN') {
    return;
  }

  if (user.role !== 'ORGANIZATION') {
    throw new ForbiddenError('Only verified organizations can manage campaigns');
  }

  if (campaign.ngo_id !== user.id) {
    throw new ForbiddenError('You can only view and manage your own campaigns');
  }
}
