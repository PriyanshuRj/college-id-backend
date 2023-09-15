import { Controller, Get, Post, Body,Req,UseGuards,Patch, Query, Delete } from '@nestjs/common';
import { PolygonService } from './polygon.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
@Controller('polygon')
export class PolygonController {
  constructor(private readonly polygonService: PolygonService) {}

  @Get('/initialize-storage')
  async InitilizeStorage(){
    const res = await this.polygonService.initDataStorageAndWallets();
    return true;
  }

  @Post('/save-credentials')
  async aveCredentialsToStorage(@Body() requestBody : {credentials : any}){
    const credentials = requestBody.credentials;
    return await this.polygonService.saveAllCredentialsToStorage(credentials);
  }
  @Post('/create-proof-request')
  async createProofRequest(@Body() requestBody : {req : any}){
    return await this.polygonService.createProofRequest(requestBody.req);
  }

  @UseGuards(JwtGuard)
  @Post('/generate-Proof')
  async genProofReq(@Body() data : {proofReq : any},  @Req() req : any){
    return await this.polygonService.generateProof(data, req.user.email);
  } 
  
  @UseGuards(JwtGuard)
  @Post('/issue-credential')
  async issueCredential(@Body() requestBody : {req : any}, @Req() req : any){
    return await this.polygonService.issueCredential(requestBody.req, req.user.email);
  }
 
  @Post('/verify')
  async verify(@Body() requestBody : {proof : any,pub_signals : any}){
    const {proof, pub_signals} = requestBody;
    return await this.polygonService.verify(proof, pub_signals);
  }
 
  @UseGuards(JwtGuard)
  @Post('/revoke')
  async revokeCreds(@Body() body : any, @Req() req : any){
    return await this.polygonService.revokeIssuedCredentials(req.user.email, body);
  }
}
