import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface CancellationEmailData {
  to: string;
  customerName: string;
  bookingReference: string;
  refundAmount?: number;
  refundCurrency?: string;
  refundTo?: string;
  hasAirlineCredits: boolean;
  airlineCredits?: any[];
  cancellationDate: Date;
}

export interface RefundEmailData {
  to: string;
  customerName: string;
  bookingReference: string;
  refundAmount: number;
  refundCurrency: string;
  refundDate: Date;
}

export interface AirlineChangeEmailData {
  to: string;
  customerName: string;
  bookingReference: string;
  changeDetails: any;
  actionRequired: boolean;
}

export interface RegistrationEmailData {
  to: string;
  customerName: string;
  email: string;
  verificationUrl?: string;
}

export interface PasswordResetEmailData {
  to: string;
  customerName: string;
  resetUrl: string;
  expiresIn: string; // e.g., "1 hour"
}

export interface LoginNotificationEmailData {
  to: string;
  customerName: string;
  loginTime: Date;
  ipAddress?: string;
  userAgent?: string;
  changePasswordUrl: string;
}

export interface BookingConfirmationEmailData {
  to: string;
  customerName: string;
  bookingReference: string;
  productType: string;
  provider: string;
  bookingDetails: {
    checkInDate?: string;
    checkOutDate?: string;
    departureDate?: string;
    arrivalDate?: string;
    origin?: string;
    destination?: string;
    hotelName?: string;
    roomType?: string;
    guests?: number;
    adults?: number;
    children?: number;
  };
  pricing: {
    basePrice: number;
    markupAmount: number;
    serviceFee: number;
    totalAmount: number;
    currency: string;
  };
  confirmationDate: Date;
  bookingId?: string;
  /** For hotels: cancellation deadline (UTC) for dispute evidence and customer clarity */
  cancellationDeadline?: Date | string | null;
  /** For hotels: policy text shown at booking (snapshot) */
  cancellationPolicySummary?: string | null;
  /** No-show policy wording per BOOKING_OPERATIONS_AND_RISK */
  noShowWording?: string | null;
}

export interface PaymentReceiptEmailData {
  to: string;
  customerName: string;
  bookingReference: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  paymentMethod?: string;
  productType: string;
  bookingDetails?: {
    checkInDate?: string;
    checkOutDate?: string;
    departureDate?: string;
    arrivalDate?: string;
    origin?: string;
    destination?: string;
    hotelName?: string;
  };
}

export interface ContactConfirmationEmailData {
  to: string;
  customerName: string;
  serviceInterestedIn: string;
}

export interface ContactSubmissionNotificationData {
  to: string[];
  submitterName: string;
  submitterEmail: string;
  submitterPhone?: string | null;
  serviceInterestedIn: string;
  message: string;
  submissionId: string;
  submittedAt: Date;
}

@Injectable()
export class ResendService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly logger = new Logger(ResendService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not configured. Email service will not work.');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'Ebony Bruce Travels <noreply@ebonybrucetravels.com>';
  }

  /**
   * Send cancellation confirmation email
   */
  async sendCancellationEmail(data: CancellationEmailData): Promise<void> {
    try {
      const subject = `Booking Cancellation Confirmation - ${data.bookingReference}`;
      const html = this.getCancellationEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Cancellation email sent to ${data.to} for booking ${data.bookingReference}`);
    } catch (error) {
      this.logger.error(`Failed to send cancellation email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the cancellation flow
    }
  }

  /**
   * Send refund processed email
   */
  async sendRefundEmail(data: RefundEmailData): Promise<void> {
    try {
      const subject = `Refund Processed - ${data.bookingReference}`;
      const html = this.getRefundEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Refund email sent to ${data.to} for booking ${data.bookingReference}`);
    } catch (error) {
      this.logger.error(`Failed to send refund email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the refund flow
    }
  }

  /**
   * Send airline-initiated change notification email
   */
  async sendAirlineChangeEmail(data: AirlineChangeEmailData): Promise<void> {
    try {
      const subject = data.actionRequired
        ? `Action Required: Flight Change - ${data.bookingReference}`
        : `Flight Update - ${data.bookingReference}`;
      const html = this.getAirlineChangeEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Airline change email sent to ${data.to} for booking ${data.bookingReference}`);
    } catch (error) {
      this.logger.error(`Failed to send airline change email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the webhook flow
    }
  }

  /**
   * Send registration welcome email
   */
  async sendRegistrationEmail(data: RegistrationEmailData): Promise<void> {
    try {
      const subject = 'Welcome to Ebony Bruce Travels!';
      const html = this.getRegistrationEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Registration email sent to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send registration email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the registration flow
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    try {
      const subject = 'Reset Your Password - Ebony Bruce Travels';
      const html = this.getPasswordResetEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Password reset email sent to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the flow
    }
  }

  /**
   * Send login notification email (delayed security notification)
   */
  async sendLoginNotificationEmail(data: LoginNotificationEmailData): Promise<void> {
    try {
      const subject = 'New Sign-In Detected - Ebony Bruce Travels';
      const html = this.getLoginNotificationEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Login notification email sent to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send login notification email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the login flow
    }
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmationEmail(data: BookingConfirmationEmailData): Promise<void> {
    try {
      const subject = `Booking Confirmed - ${data.bookingReference}`;
      const html = this.getBookingConfirmationEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Booking confirmation email sent to ${data.to} for booking ${data.bookingReference}`);
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the booking flow
    }
  }

  /**
   * Send payment receipt/invoice email
   */
  async sendPaymentReceiptEmail(data: PaymentReceiptEmailData): Promise<void> {
    try {
      const subject = `Payment Receipt - ${data.bookingReference}`;
      const html = this.getPaymentReceiptEmailTemplate(data);

      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });

      this.logger.log(`Payment receipt email sent to ${data.to} for booking ${data.bookingReference}`);
    } catch (error) {
      this.logger.error(`Failed to send payment receipt email to ${data.to}:`, error);
      // Don't throw - email failure shouldn't break the payment flow
    }
  }

  /**
   * Send contact form confirmation to the person who submitted (auto-reply)
   */
  async sendContactConfirmationEmail(data: ContactConfirmationEmailData): Promise<void> {
    try {
      const subject = 'We received your message - Ebony Bruce Travels';
      const html = this.getContactConfirmationEmailTemplate(data);
      await this.resend.emails.send({
        from: this.fromEmail,
        to: data.to,
        subject,
        html,
      });
      this.logger.log(`Contact confirmation email sent to ${data.to}`);
    } catch (error) {
      this.logger.error(`Failed to send contact confirmation to ${data.to}:`, error);
    }
  }

  /**
   * Notify admin(s) that a new Contact Us form was submitted
   */
  async sendContactSubmissionNotification(data: ContactSubmissionNotificationData): Promise<void> {
    if (!data.to || data.to.length === 0) return;
    try {
      const subject = `[Contact Us] New submission: ${data.serviceInterestedIn} - ${data.submitterName}`;
      const html = this.getContactSubmissionNotificationTemplate(data);
      for (const to of data.to) {
        await this.resend.emails.send({
          from: this.fromEmail,
          to: to.trim(),
          subject,
          html,
        });
      }
      this.logger.log(`Contact submission notification sent to ${data.to.length} admin(s)`);
    } catch (error) {
      this.logger.error('Failed to send contact submission notification to admin:', error);
    }
  }

  private getContactConfirmationEmailTemplate(data: ContactConfirmationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>We received your message</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">We received your message</h2>
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            <p>Thank you for getting in touch. We have received your enquiry regarding <strong>${data.serviceInterestedIn}</strong>.</p>
            <p>Our team will review your message and get back to you as soon as possible, usually within 1–2 business days.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any urgent questions, please call us or reply to this email.</p>
              <p style="margin-top: 20px;">Best regards,<br><strong>The Ebony Bruce Travels Team</strong></p>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated confirmation. Please do not reply to this message if you only wanted to confirm receipt.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getContactSubmissionNotificationTemplate(data: ContactSubmissionNotificationData): string {
    const phoneLine = data.submitterPhone
      ? `<p style="margin: 5px 0;"><strong>Phone:</strong> ${data.submitterPhone}</p>`
      : '';
    const submittedAtStr = data.submittedAt.toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Contact Us submission</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fff3cd; padding: 15px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #856404; margin: 0;">New Contact Us submission</h1>
          </div>
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <p>A new message was submitted via the Contact Us form.</p>
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0;">From</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${data.submitterName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.submitterEmail}</p>
              ${phoneLine}
              <p style="margin: 5px 0;"><strong>Service:</strong> ${data.serviceInterestedIn}</p>
              <p style="margin: 5px 0;"><strong>Submitted:</strong> ${submittedAtStr}</p>
              <p style="margin: 5px 0;"><strong>Submission ID:</strong> ${data.submissionId}</p>
            </div>
            <div style="background-color: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Message</h3>
              <p style="white-space: pre-wrap; margin: 0;">${(data.message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            </div>
            <p style="font-size: 12px; color: #666;">View and manage submissions in the admin panel under Contact submissions.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Cancellation email template
   */
  private getCancellationEmailTemplate(data: CancellationEmailData): string {
    const refundSection = data.hasAirlineCredits
      ? `
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">Airline Credits Issued</h3>
          <p>Instead of a cash refund, the airline has issued travel credits (vouchers) for your booking.</p>
          <p><strong>Important:</strong> You can use these credits directly with the airline for future bookings.</p>
          ${data.airlineCredits && data.airlineCredits.length > 0
            ? `
            <ul>
              ${data.airlineCredits
                .map(
                  (credit) => `
                <li>
                  <strong>Credit Code:</strong> ${credit.code || 'N/A'}<br>
                  <strong>Amount:</strong> ${credit.amount} ${credit.amount_currency}<br>
                  <strong>Airline:</strong> ${credit.airline_iata_code || 'N/A'}
                </li>
              `,
                )
                .join('')}
            </ul>
          `
            : ''}
        </div>
      `
      : data.refundAmount
        ? `
        <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0c5460;">Refund Information</h3>
          <p><strong>Refund Amount:</strong> ${data.refundAmount} ${data.refundCurrency || ''}</p>
          <p>Your refund will be processed to your original payment method. Please allow 5-10 business days for the refund to appear in your account.</p>
        </div>
      `
        : `
        <div style="background-color: #f8d7da; border-left: 4px solid #721c24; padding: 15px; margin: 20px 0;">
          <p><strong>Note:</strong> This booking was non-refundable. No refund will be issued.</p>
        </div>
      `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Cancellation Confirmation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
              Booking Cancellation Confirmation
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>We're writing to confirm that your booking has been cancelled.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${data.bookingReference}</p>
              <p style="margin: 5px 0;"><strong>Cancellation Date:</strong> ${data.cancellationDate.toLocaleDateString()}</p>
            </div>
            
            ${refundSection}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Thank you for choosing Ebony Bruce Travels.</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Refund processed email template
   */
  private getRefundEmailTemplate(data: RefundEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Refund Processed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">
              Refund Processed
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>We're pleased to inform you that your refund has been processed.</p>
            
            <div style="background-color: #d4edda; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #155724;">Refund Details</h3>
              <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${data.bookingReference}</p>
              <p style="margin: 5px 0;"><strong>Refund Amount:</strong> ${data.refundAmount} ${data.refundCurrency}</p>
              <p style="margin: 5px 0;"><strong>Refund Date:</strong> ${data.refundDate.toLocaleDateString()}</p>
            </div>
            
            <p>The refund has been processed to your original payment method. Please allow 5-10 business days for the funds to appear in your account.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Thank you for choosing Ebony Bruce Travels.</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Airline change email template
   */
  private getAirlineChangeEmailTemplate(data: AirlineChangeEmailData): string {
    const actionSection = data.actionRequired
      ? `
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">Action Required</h3>
          <p>Please review the changes to your flight and take necessary action through your booking dashboard.</p>
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Flight Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
              Flight Update
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>The airline has made changes to your flight booking.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${data.bookingReference}</p>
            </div>
            
            ${actionSection}
            
            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0;">Change Details</h3>
              <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${JSON.stringify(data.changeDetails, null, 2)}</pre>
            </div>
            
            <p>Please log in to your account to view the full details of the changes and take any necessary action.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any questions or concerns, please don't hesitate to contact our support team.</p>
              <p>Thank you for choosing Ebony Bruce Travels.</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Registration welcome email template
   */
  private getRegistrationEmailTemplate(data: RegistrationEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Ebony Bruce Travels</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
              Welcome to Ebony Bruce Travels!
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>Thank you for creating an account with Ebony Bruce Travels! We're excited to have you on board.</p>
            
            <div style="background-color: #d4edda; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #155724;">Your Account Details</h3>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${data.email}</p>
            </div>
            
            <p>You can now:</p>
            <ul>
              <li>Search and book flights, hotels, and car rentals</li>
              <li>Manage your bookings from your dashboard</li>
              <li>Receive exclusive travel deals and promotions</li>
              <li>Track your booking status in real-time</li>
            </ul>
            
            ${data.verificationUrl ? `
            <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0c5460;">Verify Your Email</h3>
              <p>Please verify your email address to complete your registration and unlock all features.</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="${data.verificationUrl}" 
                   style="display: inline-block; background-color: #0c5460; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser: ${data.verificationUrl}</p>
            </div>
            ` : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Thank you for choosing Ebony Bruce Travels. We look forward to helping you plan your next adventure!</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Login notification email template (security alert)
   */
  private getLoginNotificationEmailTemplate(data: LoginNotificationEmailData): string {
    const loginTime = data.loginTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Sign-In Detected</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
              New Sign-In Detected
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>We detected a new sign-in to your Ebony Bruce Travels account.</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">Sign-In Details</h3>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${loginTime}</p>
              ${data.ipAddress ? `<p style="margin: 5px 0;"><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
              ${data.userAgent ? `<p style="margin: 5px 0;"><strong>Device:</strong> ${data.userAgent}</p>` : ''}
            </div>
            
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #721c24;">Was this you?</h3>
              <p>If you recognize this sign-in, no action is needed. Your account is secure.</p>
              <p><strong>If you did NOT initiate this sign-in, please change your password immediately to secure your account.</strong></p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.changePasswordUrl}" 
                 style="display: inline-block; background-color: #dc3545; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Change Password
              </a>
            </div>
            
            <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0c5460;">Security Tips</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Use a strong, unique password</li>
                <li>Never share your password with anyone</li>
                <li>Enable two-factor authentication if available</li>
                <li>Log out from shared or public devices</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any concerns about your account security, please contact our support team immediately.</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Security Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated security notification. Please do not reply to this message.</p>
            <p>If you did not sign in to your account, please change your password immediately.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Password reset email template
   */
  private getPasswordResetEmailTemplate(data: PasswordResetEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
              Reset Your Password
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>We received a request to reset your password for your Ebony Bruce Travels account.</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <p><strong>This link will expire in ${data.expiresIn}.</strong></p>
              <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetUrl}" 
                 style="display: inline-block; background-color: #e74c3c; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 12px; color: #666;">Or copy and paste this link into your browser: ${data.resetUrl}</p>
            
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #721c24;">Security Notice</h3>
              <p>For your security, this password reset link will expire in ${data.expiresIn}. If you need to reset your password after it expires, please request a new reset link.</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any questions or concerns, please contact our support team.</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Security Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Booking confirmation email template
   */
  private getBookingConfirmationEmailTemplate(data: BookingConfirmationEmailData): string {
    const productTypeLabel = data.productType === 'HOTEL' ? 'Hotel' : data.productType === 'FLIGHT_INTERNATIONAL' || data.productType === 'FLIGHT_DOMESTIC' ? 'Flight' : data.productType === 'CAR_RENTAL' ? 'Car Rental' : 'Booking';
    
    const bookingDetailsSection = data.bookingDetails.hotelName
      ? `
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Hotel Details</h3>
          <p style="margin: 5px 0;"><strong>Hotel:</strong> ${data.bookingDetails.hotelName}</p>
          ${data.bookingDetails.roomType ? `<p style="margin: 5px 0;"><strong>Room Type:</strong> ${data.bookingDetails.roomType}</p>` : ''}
          ${data.bookingDetails.checkInDate ? `<p style="margin: 5px 0;"><strong>Check-in:</strong> ${new Date(data.bookingDetails.checkInDate).toLocaleDateString()}</p>` : ''}
          ${data.bookingDetails.checkOutDate ? `<p style="margin: 5px 0;"><strong>Check-out:</strong> ${new Date(data.bookingDetails.checkOutDate).toLocaleDateString()}</p>` : ''}
          ${data.bookingDetails.guests ? `<p style="margin: 5px 0;"><strong>Guests:</strong> ${data.bookingDetails.guests}</p>` : ''}
          ${data.bookingDetails.adults ? `<p style="margin: 5px 0;"><strong>Adults:</strong> ${data.bookingDetails.adults}</p>` : ''}
          ${data.bookingDetails.children ? `<p style="margin: 5px 0;"><strong>Children:</strong> ${data.bookingDetails.children}</p>` : ''}
        </div>
      `
      : data.bookingDetails.origin && data.bookingDetails.destination
        ? `
        <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0;">Flight Details</h3>
          <p style="margin: 5px 0;"><strong>Route:</strong> ${data.bookingDetails.origin} → ${data.bookingDetails.destination}</p>
          ${data.bookingDetails.departureDate ? `<p style="margin: 5px 0;"><strong>Departure:</strong> ${new Date(data.bookingDetails.departureDate).toLocaleDateString()}</p>` : ''}
          ${data.bookingDetails.arrivalDate ? `<p style="margin: 5px 0;"><strong>Arrival:</strong> ${new Date(data.bookingDetails.arrivalDate).toLocaleDateString()}</p>` : ''}
        </div>
      `
        : '';

    const defaultNoShowWording =
      'In case of no-show, the hotel may charge the full stay amount to the card used at booking. Our service fee is non-refundable once the booking is confirmed.';
    const noShowText = data.noShowWording || (data.productType === 'HOTEL' ? defaultNoShowWording : null);
    const hasHotelPolicy =
      data.productType === 'HOTEL' && (data.cancellationDeadline || data.cancellationPolicySummary || noShowText);
    const hotelPolicySection = hasHotelPolicy
      ? `
        <div style="background-color: #fff3cd; border-left: 4px solid #856404; padding: 15px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">Cancellation & No-Show Policy</h3>
          ${data.cancellationDeadline ? `<p style="margin: 5px 0;"><strong>Cancellation deadline (UTC):</strong> ${typeof data.cancellationDeadline === 'string' ? data.cancellationDeadline : new Date(data.cancellationDeadline).toISOString().replace('T', ' ').slice(0, 19)} UTC</p>` : ''}
          ${data.cancellationPolicySummary ? `<p style="margin: 5px 0;"><strong>Policy:</strong> ${data.cancellationPolicySummary}</p>` : ''}
          ${noShowText ? `<p style="margin: 10px 0 0 0;"><strong>No-show:</strong> ${noShowText}</p>` : ''}
        </div>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">
              Booking Confirmed! 🎉
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>We're excited to confirm that your ${productTypeLabel.toLowerCase()} booking has been successfully confirmed!</p>
            
            <div style="background-color: #d4edda; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #155724;">Booking Reference</h3>
              <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #155724;">${data.bookingReference}</p>
              <p style="margin: 5px 0; font-size: 12px; color: #666;">Please keep this reference number for your records</p>
            </div>
            
            ${bookingDetailsSection}
            ${hotelPolicySection}
            
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0;">Pricing Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">Base Price:</td>
                  <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #ddd;">${data.pricing.currency} ${data.pricing.basePrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">Service Fee:</td>
                  <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #ddd;">${data.pricing.currency} ${data.pricing.serviceFee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">Markup:</td>
                  <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #ddd;">${data.pricing.currency} ${data.pricing.markupAmount.toFixed(2)}</td>
                </tr>
                <tr style="font-weight: bold; font-size: 18px;">
                  <td style="padding: 12px 0; border-top: 2px solid #2c3e50;">Total Amount:</td>
                  <td style="text-align: right; padding: 12px 0; border-top: 2px solid #2c3e50;">${data.pricing.currency} ${data.pricing.totalAmount.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0c5460;">What's Next?</h3>
              <p>Your booking is confirmed and you should receive a separate payment receipt shortly.</p>
              <p>You can view your booking details and manage your reservation by logging into your account.</p>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Thank you for choosing Ebony Bruce Travels!</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>Confirmation Date: ${data.confirmationDate.toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Payment receipt/invoice email template
   */
  private getPaymentReceiptEmailTemplate(data: PaymentReceiptEmailData): string {
    const productTypeLabel = data.productType === 'HOTEL' ? 'Hotel' : data.productType === 'FLIGHT_INTERNATIONAL' || data.productType === 'FLIGHT_DOMESTIC' ? 'Flight' : data.productType === 'CAR_RENTAL' ? 'Car Rental' : 'Booking';
    
    const bookingDetailsSection = data.bookingDetails
      ? data.bookingDetails.hotelName
        ? `
          <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p style="margin: 5px 0;"><strong>Hotel:</strong> ${data.bookingDetails.hotelName}</p>
            ${data.bookingDetails.checkInDate ? `<p style="margin: 5px 0;"><strong>Check-in:</strong> ${new Date(data.bookingDetails.checkInDate).toLocaleDateString()}</p>` : ''}
            ${data.bookingDetails.checkOutDate ? `<p style="margin: 5px 0;"><strong>Check-out:</strong> ${new Date(data.bookingDetails.checkOutDate).toLocaleDateString()}</p>` : ''}
          </div>
        `
        : data.bookingDetails.origin && data.bookingDetails.destination
          ? `
          <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p style="margin: 5px 0;"><strong>Route:</strong> ${data.bookingDetails.origin} → ${data.bookingDetails.destination}</p>
            ${data.bookingDetails.departureDate ? `<p style="margin: 5px 0;"><strong>Departure:</strong> ${new Date(data.bookingDetails.departureDate).toLocaleDateString()}</p>` : ''}
            ${data.bookingDetails.arrivalDate ? `<p style="margin: 5px 0;"><strong>Arrival:</strong> ${new Date(data.bookingDetails.arrivalDate).toLocaleDateString()}</p>` : ''}
          </div>
        `
          : ''
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2c3e50; margin: 0;">Ebony Bruce Travels</h1>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
              Payment Receipt
            </h2>
            
            <p>Dear ${data.customerName || 'Valued Customer'},</p>
            
            <p>Thank you for your payment. This email serves as your receipt for the ${productTypeLabel.toLowerCase()} booking.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0;">Payment Information</h3>
              <p style="margin: 5px 0;"><strong>Booking Reference:</strong> ${data.bookingReference}</p>
              <p style="margin: 5px 0;"><strong>Payment Intent ID:</strong> ${data.paymentIntentId}</p>
              <p style="margin: 5px 0;"><strong>Payment Date:</strong> ${data.paymentDate.toLocaleString()}</p>
              ${data.paymentMethod ? `<p style="margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>` : ''}
            </div>
            
            ${bookingDetailsSection}
            
            <div style="background-color: #e8f4f8; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #0c5460;">Amount Paid</h3>
              <p style="font-size: 32px; font-weight: bold; color: #0c5460; margin: 10px 0;">
                ${data.currency.toUpperCase()} ${(data.amount / 100).toFixed(2)}
              </p>
              <p style="font-size: 12px; color: #666; margin: 5px 0;">Payment processed successfully</p>
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #856404;">Important Notes</h3>
              <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
                <li>Please keep this receipt for your records</li>
                <li>This receipt confirms that your payment has been processed</li>
                <li>If you have any questions about this payment, please contact our support team</li>
              </ul>
            </div>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Thank you for choosing Ebony Bruce Travels!</p>
              <p style="margin-top: 20px;">
                Best regards,<br>
                <strong>The Ebony Bruce Travels Team</strong>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>This receipt is for your records. Please save or print this email for your files.</p>
          </div>
        </body>
      </html>
    `;
  }
}

