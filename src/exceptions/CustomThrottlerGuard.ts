import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: import('@nestjs/throttler').ThrottlerLimitDetail
  ): Promise<void> {
    throw new ThrottlerException('Too many requests! Please try again later.');
  }
}
