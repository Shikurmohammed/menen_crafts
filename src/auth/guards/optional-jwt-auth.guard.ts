import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        // Just check if token exists, don't throw error if missing
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        // Return null instead of throwing error if no user
        return user || null;
    }
}