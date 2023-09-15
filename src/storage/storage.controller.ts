import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DatabaseDataSource } from './services/storage.service';
// import { MerkleTreeDBStorage } from './services/merkletree.service';
import { MerkleTreeType } from '@0xpolygonid/js-sdk';
@Controller('storage')
export class StorageController {
  constructor(
    // private readonly storageService: StorageService,
    
    // private readonly merkleTreeService : MerkleTreeDBStorage
    ) {}

  //   @Post("merkletree/start")
  //   start(@Body() body : {databasekey : string, _mtDepth : number}){
  //     const {databasekey, _mtDepth} = body;
  //     return this.merkleTreeService.initialize(_mtDepth)
  //   }

  // @Post("merkletree/")
  // create(@Body() body : {identifier : string}) {
  //   return this.merkleTreeService.createIdentityMerkleTrees(body.identifier);
  // }

  // @Post("merkletree/add")
  // addNode(@Body() body : {identifier : string, mtType : string, h : number, v : number} ){
  //   const {identifier, mtType, h, v} = body;
  //   return this.merkleTreeService.addToMerkleTree(
  //     identifier,
  //     parseInt(mtType),
  //     BigInt(h),
  //     BigInt(v)
  //   )
  // }
  // @Post("merkletree/get-merkletree")
  // getMerkleTree(@Body() body : {identifier : string}){
  //   return this.merkleTreeService.getIdentityMerkleTreesInfo(
  //     body.identifier
  //   )
  // }
  // @Post("merkletree/get-type")
  // getMerkleTreeByType(@Body() body : {identifier : string, mtType : string}){
  //   const {identifier, mtType} = body;
  //   return this.merkleTreeService.getMerkleTreeByIdentifierAndType(
  //     identifier,
  //     parseInt(mtType)
  //   )
  // }
  // @Post("merkletree/change-identifier")
  // ChangeIdentifier(@Body() body : {oldIdentifier : string, newIndetifier : string}){
  //   const {newIndetifier, oldIdentifier} = body;
  //   return this.merkleTreeService.bindMerkleTreeToNewIdentifier(
  //     oldIdentifier,
  //     newIndetifier
  //   )
  // }



}
