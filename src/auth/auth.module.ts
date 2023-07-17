import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "./models/user.entity";
import { JwtModule } from "@nestjs/jwt/dist";
import { JwtGuard } from "./guards/jwt.guard";
import { JwtStrategy } from "./guards/jwt.stategy";
@Module({
    imports: [
        JwtModule.registerAsync({
            useFactory: () =>({
                secret : process.env.JWT_SECRET,
                signOptions: {expiresIn : '36000s'}
            })
        }),
        TypeOrmModule.forFeature([UserEntity])
    ],
    controllers:[AuthController],
    providers:[AuthService, JwtGuard, JwtStrategy]
})
export class AuthModule {}