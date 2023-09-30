import {Injectable} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import {ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class AdminStratagy extends PassportStrategy(Strategy) {
    
    async validate(payload: any) {
        console.log("called")
        if(payload.user.isAdmin)
        return {...payload.user};
        else return false;
    }
}