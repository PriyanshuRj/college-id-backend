import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialEntity, CredentialRequestEntity, CredentialTemplateEntity } from './models/credential.entity';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { JwtModule } from '@nestjs/jwt';
import { PolygonService } from 'src/polygon/polygon.service';
import { DIDEntity } from 'src/storage/entities/storage.entity';
import { AdminGuard } from 'src/auth/guards/admin.gurad';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
@Module({
    imports: [
        JwtModule.registerAsync({
            useFactory: () =>({
                secret : process.env.JWT_SECRET,
                signOptions: {expiresIn : '36000s'}
            })
        }),
        TypeOrmModule.forFeature([CredentialEntity, CredentialRequestEntity, CredentialTemplateEntity, DIDEntity])
    ],
  
    providers: [CredentialsService, PolygonService, AdminGuard, JwtGuard],
    controllers: [CredentialsController]
})
export class CredentialsModule {

}
