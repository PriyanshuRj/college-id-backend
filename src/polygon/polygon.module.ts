import { Module } from '@nestjs/common';
import { PolygonService } from './polygon.service';
import { PolygonController } from './polygon.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DIDEntity } from 'src/storage/entities/storage.entity';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ DIDEntity])],
  controllers: [PolygonController],
  providers: [PolygonService,
  JwtGuard
]
})
export class PolygonModule {}
