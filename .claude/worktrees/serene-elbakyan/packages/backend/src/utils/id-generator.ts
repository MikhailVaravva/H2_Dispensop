import crypto from 'crypto';

export function generatePermissionId(): string {
  return `perm_${crypto.randomUUID().substring(0, 12)}`;
}
