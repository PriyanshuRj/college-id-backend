import {Injectable} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    
    async validate(payload: any) {
        if(payload.user.isAdmin)
        return {...payload.user};
        else return false;
    }
}