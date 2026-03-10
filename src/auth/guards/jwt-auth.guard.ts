import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { Observable } from "rxjs";
// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {

// }
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Token expired
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Access token has expired. Please log in again.');
    }

    // Invalid token
    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException('Invalid access token.');
    }

    // No token at all
    if (!user) {
      throw new UnauthorizedException('Authentication token is missing.');
    }

    return user;
  }
}
