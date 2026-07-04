import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async subscribe(email: string): Promise<{ message: string }> {
    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email already subscribed');
    }

    await this.prisma.newsletterSubscriber.create({
      data: { email },
    });

    this.logger.log(`📧 New subscriber: ${email}`);
    return { message: 'Subscribed successfully!' };
  }
}