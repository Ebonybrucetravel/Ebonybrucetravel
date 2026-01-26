import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('User Profile')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: ProfileResponseDto })
  async getProfile(@Request() req): Promise<ProfileResponseDto> {
    return this.userService.getProfile(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: ProfileResponseDto })
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto): Promise<ProfileResponseDto> {
    return this.userService.updateProfile(req.user.userId, updateDto);
  }

  @Put('me/avatar')
  @ApiOperation({ summary: 'Upload user profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Profile image uploaded successfully', type: ProfileResponseDto })
  @UseInterceptors(FileInterceptor('image'))
  async uploadAvatar(
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<ProfileResponseDto> {
    return this.userService.uploadAvatar(req.user.userId, file);
  }
}

