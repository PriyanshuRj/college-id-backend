import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { ITreeStorage, LocalStorageDB, Merkletree, bytes2Hex, str2Bytes, Hash } from '@iden3/js-merkletree';
import { DatabaseStorageDB } from "./DatabaseStorageDB.service";
import { StorageEntity } from "../entities/storage.entity";
import { IdentityMerkleTreeMetaInformation, MerkleTreeType } from "@0xpolygonid/js-sdk";
import * as uuid from 'uuid';
import { DataSource } from 'typeorm';

const mtTypes = [MerkleTreeType.Claims, MerkleTreeType.Revocations, MerkleTreeType.Roots];

export class MerkleTreeDBStorage {
    
     /**
   * key for the storage key metadata
   *
   * @static
   */
    static readonly storageKeyMeta = 'merkle-tree-meta';

    _mtDepth: number = 10;
    
    storageRepository = null;
    
    dataSource = new DataSource({
        type:'postgres',
        host:process.env.POSTGRES_HOST,
        port: parseInt(<string> process.env.POSTGRES_PORT),
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DATABASE,
        synchronize: true,
        entities:[StorageEntity]
      });
      
    
      
      constructor(  
        _mtDepth : number,
          // databaseKey : string
          ) { 
              
            }
            
    async initialize(_mtDepth: number) {
        if(!this.dataSource.isInitialized) await this.dataSource.initialize();
        this._mtDepth = _mtDepth;
        this.storageRepository = this.dataSource.getRepository(StorageEntity)
        return {
            message : "Initialization complete"
        };

    }

    /** creates a tree in the databse storage */
    async createIdentityMerkleTrees(
        identifier: string
    ): Promise<IdentityMerkleTreeMetaInformation[]> {
        if (!identifier) {
            identifier = `${uuid.v4()}`;
        }
        const createMetaInfo = () => {
            const treesMeta: IdentityMerkleTreeMetaInformation[] = [];
            for (let index = 0; index < mtTypes.length; index++) {
                const mType = mtTypes[index];
                const treeId = identifier.concat('+' + mType.toString());
                const metaInfo = { treeId, identifier, type: mType };
                treesMeta.push(metaInfo);
            }
            return treesMeta;
        };

        const meta = (await this.storageRepository.findOne({
            where: {
                key: MerkleTreeDBStorage.storageKeyMeta
            }
        }))?.value

        if (meta) {
            const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
            const presentMetaForIdentifier = metaInfo.find((m) => m.treeId === `${identifier}+${m.type}`);
            if (presentMetaForIdentifier) {
                throw new HttpException({
                    status: HttpStatus.BAD_REQUEST,
                    error:  `Present merkle tree meta information in the store for current identifier ${identifier}`
                }, HttpStatus.BAD_REQUEST)
                
            }
            const identityMetaInfo = metaInfo.filter((m) => m.identifier === identifier);
            if (identityMetaInfo.length > 0) {
                return identityMetaInfo;
            }
            const treesMeta = createMetaInfo();
            await this.storageRepository.update({
                key: MerkleTreeDBStorage.storageKeyMeta,
            }, {
                value: JSON.stringify([...metaInfo, ...treesMeta])
            })

            return [...metaInfo, ...treesMeta];
        }
        const treesMeta = createMetaInfo();

        await this.storageRepository.save({
            key: MerkleTreeDBStorage.storageKeyMeta,
            value: JSON.stringify(treesMeta)
        })
        return treesMeta;
    }

  /**
   *
   * getIdentityMerkleTreesInfo from the Database
   * @param {string} identifier
   * @returns `{Promise<IdentityMerkleTreeMetaInformation[]>}`
   */
    async getIdentityMerkleTreesInfo(
        identifier: string
    ): Promise<IdentityMerkleTreeMetaInformation[]> {
        const meta = (await this.storageRepository.findOne({
            where: {
                key: MerkleTreeDBStorage.storageKeyMeta
            }
        })).value;
        if (meta) {
            const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
            return metaInfo.filter((m) => m.identifier === identifier);
        }
        throw new HttpException({
            status: HttpStatus.NOT_FOUND,
            error:  `Merkle tree meta not found for identifier ${identifier}`
        }, HttpStatus.NOT_FOUND)
        
    }

    /** get merkle tree from the database */
    async getMerkleTreeByIdentifierAndType(
        identifier: string,
        mtType: MerkleTreeType
    ): Promise<Merkletree> {
        const meta = (await this.storageRepository.findOne({
            where: {
                key: MerkleTreeDBStorage.storageKeyMeta
            }
        }))?.value;
        const err = new Error(`Merkle tree not found for identifier ${identifier} and type ${mtType}`);
        if (!meta) {
            throw err;
        }

        const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
        const resultMeta = metaInfo.filter((m) => m.identifier === identifier && m.type === mtType)[0];
        if (!resultMeta) {
            throw err;
        }
        if (this.storageRepository && this.dataSource.isInitialized) {
            const merkleTreeDatabaseStorageInstance = new DatabaseStorageDB(str2Bytes(resultMeta.treeId), this.storageRepository);
            await merkleTreeDatabaseStorageInstance.setRootFromBytes(str2Bytes(resultMeta.treeId));
            return new Merkletree(merkleTreeDatabaseStorageInstance, true, this._mtDepth);
        }

    }

  /** adds to merkle tree in the database */
    async addToMerkleTree(
        identifier: string,
        mtType: MerkleTreeType,
        hindex: bigint,
        hvalue: bigint
    ): Promise<void> {
        const meta = (await this.storageRepository.findOne({
            where: {
                key: MerkleTreeDBStorage.storageKeyMeta
            }
        })).value
        if (!meta) {
            throw new HttpException({
                status: HttpStatus.NOT_FOUND,
                error:  `Merkle tree meta not found for identifier ${identifier}`
            }, HttpStatus.NOT_FOUND)

        }

        const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
        const resultMeta = metaInfo.filter((m) => m.identifier === identifier && m.type === mtType)[0];

        if (!resultMeta) {
            throw new HttpException({
                status: HttpStatus.NOT_FOUND,
                error:  `Merkle tree not found for identifier ${identifier} and type ${mtType}`
            }, HttpStatus.NOT_FOUND)
       
        }

        if (this.storageRepository && this.dataSource.isInitialized) {
            const merkleTreeDatabaseStorageInstance = new DatabaseStorageDB(str2Bytes(resultMeta.treeId), this.storageRepository);
            await merkleTreeDatabaseStorageInstance.setRootFromBytes(str2Bytes(resultMeta.treeId));
            const tree = new Merkletree(
                merkleTreeDatabaseStorageInstance,
                true,
                this._mtDepth
            );
            await tree.add(hindex, hvalue);
        }
        else {
            throw new HttpException({
                status: HttpStatus.NOT_FOUND,
                error:  `Merkle tree meta not found for your storage key`
            }, HttpStatus.NOT_FOUND)
           
        }
    }

  /** binds merkle tree in the database to the new identifiers */
    async bindMerkleTreeToNewIdentifier(oldIdentifier: string, newIdentifier: string): Promise<void> {
        const meta = (await this.storageRepository.findOne({
            where: {
                key: MerkleTreeDBStorage.storageKeyMeta
            }
        })).value;
        if (!meta) {
            throw new HttpException({
                status: HttpStatus.NOT_FOUND,
                error:  `Merkle tree meta not found for identifier ${oldIdentifier}`
            }, HttpStatus.NOT_FOUND)
            
        }
        const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
        const treesMeta = metaInfo
            .filter((m) => m.identifier === oldIdentifier)
            .map((m) => ({ ...m, identifier: newIdentifier }));
        if (treesMeta.length === 0) {
            throw new HttpException({
                status: HttpStatus.NOT_FOUND,
                error:  `Merkle tree meta not found for identifier ${oldIdentifier}`
            }, HttpStatus.NOT_FOUND)
     
        }

        const newMetaInfo = [...metaInfo.filter((m) => m.identifier !== oldIdentifier), ...treesMeta];
        await this.storageRepository.update({
            key: MerkleTreeDBStorage.storageKeyMeta
        }, {
            value: JSON.stringify(newMetaInfo)
        })
    }
}