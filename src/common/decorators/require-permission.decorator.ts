import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';

/**
 * Require a specific permission for this route. SUPER_ADMIN bypasses.
 * ADMIN users must have the permission in user.permissions (e.g. canViewReports).
 * If user.permissions is missing, access is allowed for backward compatibility.
 */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
