import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialEntity, CredentialRequestEntity, CredentialTemplateEntity } from './models/credential.entity';
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';
import { JwtModule } from '@nestjs/jwt';
import { PolygonService } from 'src/polygon/polygon.service';
import { DIDEntity } from 'src/storage/entities/storage.entity';
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
  
    providers: [CredentialsService],
    controllers: [CredentialsController, PolygonService]
})
export class CredentialsModule {

}
