import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@common/decorators/public.decorator';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ResendService } from '@infrastructure/email/resend.service';
import { SubmitContactDto } from './dto/submit-contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: ResendService,
  ) {}

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

    // Send confirmation email to the person who submitted (async, don't block response)
    this.resend
      .sendContactConfirmationEmail({
        to: dto.email,
        customerName: dto.name,
        serviceInterestedIn: dto.serviceInterestedIn,
      })
      .catch((err) => this.logger.warn('Contact confirmation email failed', err));

    // Notify all super admins in the database (no .env emails)
    const superAdmins = await this.prisma.user.findMany({
      where: { role: 'SUPER_ADMIN', deletedAt: null },
      select: { email: true },
    });
    const toList = superAdmins.map((u) => u.email).filter(Boolean);
    if (toList.length > 0) {
      this.resend
        .sendContactSubmissionNotification({
          to: toList,
          submitterName: dto.name,
          submitterEmail: dto.email,
          submitterPhone: dto.phone ?? null,
          serviceInterestedIn: dto.serviceInterestedIn,
          message: dto.message,
          submissionId: submission.id,
          submittedAt: submission.createdAt,
        })
        .catch((err) => this.logger.warn('Contact admin notification email failed', err));
    }

    return {
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
      data: { id: submission.id },
    };
  }
}
