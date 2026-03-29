export type PermissionStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface Permission {
  id: string;
  stationId: string;
  status: PermissionStatus;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
}
