import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "src/enums/UserRole.enum";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Get required roles from handler OR controller, with handler(method) taking precedence than controller(class)
        //The @Roles() decorator will store the required roles in the metadata of the route handler (method) or controller (class). The guard uses the Reflector to retrieve this metadata and determine if the user has the necessary role to access the route.
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles || requiredRoles.length === 0) {
            return true; // No roles specified → open to any authenticated user
        }

        //  Get user from request (JwtAuthGuard should attach it)
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('User not found in request');
        }

        //  Check if user role is included in required roles
        if (!requiredRoles.includes(user.role)) {
            throw new ForbiddenException('You do not have permission (role-based)');
        }

        return true;
    }
}
