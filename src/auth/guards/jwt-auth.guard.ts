import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import { Observable } from "rxjs";
// @Injectable()
// export class JwtAuthGuard extends AuthGuard('jwt') {

// }
@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }
    canActivate(context: ExecutionContext): Promise<boolean> | Observable<boolean> {
        //1. Extract request from execution context
        const request: Request = context.switchToHttp().getRequest();
        //2. Extract Token from the request header
        //Split the authorization header: Beare token, and take the token part
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        //3. Validate Token & allow or deny access based on the validation result
        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException('Invalid token format');
        }
        return this.jwtService.verifyAsync(token).then((decoded) => {
            //Attach the decoded user information to the request object for further use
            (request as any).user = decoded;
            return true;
        }).catch(() => {
            throw new UnauthorizedException('Invalid or expired token');
        });



    }
}