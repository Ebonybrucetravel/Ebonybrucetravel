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

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
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
      this.logger.warn(
        `Client Error: ${request.method} ${request.url} - ${errorResponse.message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
