// main.ts or a separate file
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Logger, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    
    this.logger.log(`➡️  ${method} ${url}`);
    
    // Log headers (except authorization)
    const headers = { ...req.headers };
    if (headers.authorization) headers.authorization = 'Bearer [REDACTED]';
    this.logger.debug('Headers:', JSON.stringify(headers, null, 2));
    
    // Log body if exists
    if (req.body) {
      this.logger.debug('Body:', JSON.stringify(req.body, null, 2));
    }
    
    // Log files if exists
    if (req.files) {
      this.logger.debug(`Files: ${JSON.stringify(req.files)}`);
    }
    
    const now = Date.now();
    return next.handle().pipe(
      tap({
        next: (data) => {
          this.logger.log(`⬅️  ${method} ${url} ${Date.now() - now}ms`);
        },
        error: (error) => {
          this.logger.error(`❌  ${method} ${url} ${Date.now() - now}ms - ${error.message}`);
          this.logger.error(error.stack);
        },
      }),
    );
  }
}

