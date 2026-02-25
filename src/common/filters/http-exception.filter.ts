import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    // Sanitize error messages in production
    const isProduction = process.env.NODE_ENV === 'production';
    let errorMessage: string;
    let errorType: string | undefined;

    if (typeof message === 'string') {
      errorMessage = isProduction && status >= 500
        ? 'An internal server error occurred. Please try again later.'
        : message;
    } else {
      errorMessage = isProduction && status >= 500
        ? 'An internal server error occurred. Please try again later.'
        : (message as any).message || 'An error occurred';
      errorType = (message as any).error;
    }

    // Translate provider-specific error terminology to our frontend terminology
    let finalMessage = errorMessage;
    if (Array.isArray(errorMessage)) {
      finalMessage = errorMessage.map((err) =>
        typeof err === 'string' ? this.translateProviderError(err) : err,
      ) as any;
    } else if (typeof errorMessage === 'string') {
      finalMessage = this.translateProviderError(errorMessage);
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: finalMessage,
      error: errorType,
      ...(request['correlationId'] && { correlationId: request['correlationId'] }),
    };

    // Log error with context
    if (status >= 500) {
      this.logger.error(
        `Internal Server Error: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else if (status >= 400) {
      // For arrays, log the joined string
      const logMsg = Array.isArray(errorResponse.message)
        ? errorResponse.message.join(', ')
        : errorResponse.message;

      this.logger.warn(
        `Client Error: ${request.method} ${request.url} - ${logMsg}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Translates third-party provider terminology into our API's standard nomenclature
   * to ensure frontend developers get understandable error messages.
   */
  private translateProviderError(msg: string): string {
    if (!msg || typeof msg !== 'string') return msg;

    // Map third-provider specific terms (like Duffel/Amadeus) to our DTO schema terms
    const termMap: Record<string, string> = {
      born_on: 'dateOfBirth',
      given_name: 'firstName',
      family_name: 'lastName',
      identity_documents: 'identityDocuments',
      phone_number: 'phone',
      identity_document: 'identity document',
    };

    let translatedMsg = msg;
    for (const [providerTerm, ourTerm] of Object.entries(termMap)) {
      // Use regex with word boundaries to replace exactly that term
      const regex = new RegExp(`\\b${providerTerm}\\b`, 'gi');
      translatedMsg = translatedMsg.replace(regex, ourTerm);
    }

    return translatedMsg;
  }
}
