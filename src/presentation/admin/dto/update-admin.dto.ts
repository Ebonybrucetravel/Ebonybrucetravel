import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateAdminDto {
  @ApiProperty({ example: 'Updated Admin Name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({
    enum: ['ADMIN', 'SUPER_ADMIN'],
    example: 'ADMIN',
    required: false,
    description: 'Role must be ADMIN or SUPER_ADMIN',
  })
  @IsEnum(['ADMIN', 'SUPER_ADMIN'])
  @IsOptional()
  role?: UserRole;

  @ApiProperty({
    example: {
      canManageBookings: true,
      canManageUsers: false,
      canManageMarkups: true,
      canViewReports: true,
    },
    required: false,
    description: 'Permissions object for regular admins',
  })
  @IsObject()
  @IsOptional()
  permissions?: {
    canManageBookings?: boolean;
    canManageUsers?: boolean;
    canManageMarkups?: boolean;
    canViewReports?: boolean;
    canCancelBookings?: boolean;
    canViewAllBookings?: boolean;
  };
}

