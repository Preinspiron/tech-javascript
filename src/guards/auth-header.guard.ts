import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  SWAGGER_AUTH_HEADER,
  SWAGGER_AUTH_KEY,
} from '../constants/swagger-auth.constants';

@Injectable()
export class AuthHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const value = req.headers[SWAGGER_AUTH_HEADER.toLowerCase()];
    if (value === SWAGGER_AUTH_KEY) {
      return true;
    }
    throw new UnauthorizedException('Unauthorized');
  }
}
