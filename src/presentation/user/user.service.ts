import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CloudinaryService } from '@infrastructure/cloudinary/cloudinary.service';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        image: true,
        dateOfBirth: true,
        gender: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      title: user.title,
      phone: user.phone,
      image: user.image,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Convert dateOfBirth string to Date if provided
    const dateOfBirth = updateDto.dateOfBirth ? new Date(updateDto.dateOfBirth) : undefined;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: updateDto.name,
        title: updateDto.title,
        phone: updateDto.phone,
        dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : undefined,
        gender: updateDto.gender,
      },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        image: true,
        dateOfBirth: true,
        gender: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      title: updatedUser.title,
      phone: updatedUser.phone,
      image: updatedUser.image,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old image if exists
    if (user.image) {
      const oldPublicId = this.cloudinaryService.extractPublicId(user.image);
      if (oldPublicId) {
        // Extract full public ID including folder path
        const fullPublicId = user.image.includes('ebony-bruce-travels/users')
          ? `ebony-bruce-travels/users/${oldPublicId}`
          : oldPublicId;
        await this.cloudinaryService.deleteImage(fullPublicId);
      }
    }

    // Upload new image
    const { url } = await this.cloudinaryService.uploadImage(
      file,
      'ebony-bruce-travels/users',
      `user-${userId}`,
    );

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { image: url },
      select: {
        id: true,
        email: true,
        name: true,
        title: true,
        phone: true,
        image: true,
        dateOfBirth: true,
        gender: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      title: updatedUser.title,
      phone: updatedUser.phone,
      image: updatedUser.image,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, provider: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // OAuth users don't have passwords
    if (!user.password || user.provider) {
      throw new BadRequestException('Password cannot be changed for OAuth accounts. Please use social login.');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Log to audit table
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'CHANGE_PASSWORD',
          entityType: 'User',
          entityId: userId,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      // Don't fail password change if audit log fails
      console.error('Failed to create audit log for password change:', error);
    }
  }

  async deleteAccount(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['PENDING', 'PAYMENT_PENDING', 'CONFIRMED'],
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user has active bookings
    if (user.bookings.length > 0) {
      throw new BadRequestException(
        'Cannot delete account with active bookings. Please cancel or complete all bookings first.',
      );
    }

    // Log to audit table before deletion
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'DELETE_ACCOUNT',
          entityType: 'User',
          entityId: userId,
          changes: {
            email: user.email,
            deletedAt: new Date().toISOString(),
          },
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      // Don't fail deletion if audit log fails
      console.error('Failed to create audit log for account deletion:', error);
    }

    // Soft delete user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${user.email}`, // Make email unique for soft delete
      },
    });

    // Delete profile image from Cloudinary if exists
    if (user.image) {
      const oldPublicId = this.cloudinaryService.extractPublicId(user.image);
      if (oldPublicId) {
        const fullPublicId = user.image.includes('ebony-bruce-travels/users')
          ? `ebony-bruce-travels/users/${oldPublicId}`
          : oldPublicId;
        await this.cloudinaryService.deleteImage(fullPublicId).catch(() => {
          // Ignore errors - image might already be deleted
        });
      }
    }
  }
}

