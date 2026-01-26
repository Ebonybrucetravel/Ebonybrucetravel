import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CloudinaryService } from '@infrastructure/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
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
        phone: updateDto.phone,
        dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : undefined,
        gender: updateDto.gender,
      },
      select: {
        id: true,
        email: true,
        name: true,
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
        await this.cloudinaryService.deleteImage(`ebony-bruce-travels/users/${oldPublicId}`);
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
      phone: updatedUser.phone,
      image: updatedUser.image,
      dateOfBirth: updatedUser.dateOfBirth,
      gender: updatedUser.gender,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }
}

