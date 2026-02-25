import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class LoyaltySummaryDto {
  @ApiProperty({ example: 45000 })
  balance: number;

  @ApiProperty({ example: 52000 })
  totalEarned: number;

  @ApiProperty({ example: 'GOLD', enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] })
  tier: string;

  @ApiPropertyOptional({ example: 1.5 })
  pointsMultiplier?: number;
}

export class ProfileResponseDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  name: string | null;

  @ApiPropertyOptional({
    example: 'Mr',
    nullable: true,
    description: 'Title used for bookings (e.g. Mr, Mrs, Ms, Miss, Dr)',
  })
  title: string | null;

  @ApiProperty({ example: '+2348012345678', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'https://res.cloudinary.com/.../user.jpg', nullable: true })
  image: string | null;

  @ApiProperty({ example: '1992-05-15T00:00:00.000Z', nullable: true })
  dateOfBirth: Date | null;

  @ApiProperty({ example: 'Male', nullable: true, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] })
  gender: string | null;

  @ApiProperty({ enum: UserRole, example: 'CUSTOMER' })
  role: UserRole;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
