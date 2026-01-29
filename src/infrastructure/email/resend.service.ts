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
}

