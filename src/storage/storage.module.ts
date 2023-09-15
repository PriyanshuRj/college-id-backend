import { Module } from '@nestjs/common';
import { DatabaseDataSource } from './services/storage.service';

import { StorageController } from './storage.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerkleTreeDBStorage } from './services/merkletree.service';
import { DIDEntity, StorageEntity } from './entities/storage.entity';

@Module({
  imports:[
    TypeOrmModule.forFeature([StorageEntity, DIDEntity])
  ],
  controllers: [StorageController],
  providers: [DatabaseDataSource, MerkleTreeDBStorage],
  exports: [DatabaseDataSource]
})
export class StorageModule {}
