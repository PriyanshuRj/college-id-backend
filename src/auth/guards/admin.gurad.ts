import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport/dist";

@Injectable()
export class JwtGuard extends AuthGuard('admin') {}