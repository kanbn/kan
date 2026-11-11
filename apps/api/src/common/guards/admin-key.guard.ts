import { timingSafeEqual } from "crypto";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { Injectable, UnauthorizedException } from "@nestjs/common";

const matches = (provided: string, expected: string) => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Instance-admin endpoints: the caller must send `x-admin-api-key` equal to
// KAN_ADMIN_API_KEY. With no key configured, every request is rejected.
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.KAN_ADMIN_API_KEY;
    const provided = context
      .switchToHttp()
      .getRequest<Request>()
      .header("x-admin-api-key");

    if (!expected || !provided || !matches(provided, expected))
      throw new UnauthorizedException();

    return true;
  }
}
