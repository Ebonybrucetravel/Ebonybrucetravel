import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { SubmitContactDto } from './dto/submit-contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit Contact Us form' })
  @ApiResponse({ status: 201, description: 'Submission received' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async submit(@Body() dto: SubmitContactDto) {
    const submission = await this.prisma.contactSubmission.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        serviceInterestedIn: dto.serviceInterestedIn,
        message: dto.message,
        subject: dto.subject ?? null,
      },
    });
    return {
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
      data: { id: submission.id },
    };
  }
}
