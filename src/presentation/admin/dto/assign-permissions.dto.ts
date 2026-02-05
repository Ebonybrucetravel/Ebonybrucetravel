import { IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignPermissionsDto {
  @ApiProperty({
    example: {
      canManageBookings: true,
      canManageUsers: false,
      canManageMarkups: true,
      canViewReports: true,
      canCancelBookings: true,
      canViewAllBookings: true,
    },
    description: 'Permissions object for regular admins. SUPER_ADMIN has all permissions by default.',
  })
  @IsObject()
  @IsNotEmpty()
  permissions: {
    canManageBookings?: boolean;
    canManageUsers?: boolean;
    canManageMarkups?: boolean;
    canViewReports?: boolean;
    canCancelBookings?: boolean;
    canViewAllBookings?: boolean;
  };
}

