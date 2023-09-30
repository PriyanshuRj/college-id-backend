import { Controller, Post, Body } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { User,Admin } from "./models/user.class";
import { Observable, map } from "rxjs";

@Controller('auth')
export class AuthController {
    constructor(private authService : AuthService) {}

    @Post('register-admin')
    async registeAdminr(@Body() admin: Admin) : Promise<Observable<Admin>> {
        return await this.authService.signupAsdmin(admin);
    }

    @Post('login-admin')
    loginAdmin(@Body() admin : Admin): Observable<{token : string}> { 
        return this.authService.loginAdmin(admin).pipe(
            map((jwt: string)=> ({token:jwt}))
        );
    }
    @Post('register')
    async register(@Body() user: User) : Promise<Observable<User>> {
        return await this.authService.signup(user);
    }

    @Post('login')
    login(@Body() user : User): Observable<{token : string}> { 
        return this.authService.login(user).pipe(
            map((jwt: string)=> ({token:jwt}))
        );
    }

}