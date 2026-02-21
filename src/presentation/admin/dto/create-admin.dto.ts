import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@ebonybruce.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin User' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'],
    example: 'ADMIN',
    description: 'Create a customer (CUSTOMER) or admin user (ADMIN, SUPER_ADMIN).',
  })
  @IsEnum(['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'])
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}
