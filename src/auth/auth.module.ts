import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminEntity, UserEntity } from "./models/user.entity";
import { JwtModule } from "@nestjs/jwt/dist";
import { JwtGuard } from "./guards/jwt.guard";
import { JwtStrategy } from "./guards/jwt.stategy";
import { PolygonService } from "src/polygon/polygon.service";
import { DIDEntity } from "src/storage/entities/storage.entity";
@Module({
    imports: [
        JwtModule.registerAsync({
            useFactory: () =>({
                secret : process.env.JWT_SECRET,
                signOptions: {expiresIn : '36000s'}
            })
        }),
        TypeOrmModule.forFeature([UserEntity, AdminEntity, DIDEntity])
    ],
    controllers:[AuthController],
    providers:[AuthService, JwtGuard, JwtStrategy, PolygonService]
})
export class AuthModule {}