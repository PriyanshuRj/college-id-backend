import { Controller, Get, UseGuards, Req, Post, Query, HttpException, HttpStatus } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { AdminGuard } from 'src/auth/guards/admin.gurad';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CredentialRequest, CredentialTemplate, Credential } from './models/credential.class';
import {Observable} from 'rxjs';

@Controller('credentials')
@UseGuards(JwtGuard)
export class CredentialsController {
    constructor (private readonly credentialService : CredentialsService) {}
    
    @UseGuards(AdminGuard)
    @Get('templates')
    getAllTemplates(@Req() request : any) : Observable<{message : string, templates : any[]}>{
        const email = request.user.email;
        return this.credentialService.fetchAllTemplates(email);
    }

    @UseGuards(AdminGuard)
    @Post('create-template')
    createTemplate(template : CredentialTemplate) :  Observable<{message : string, template : any}>{
        if(!template){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return this.credentialService.createCredentialTemplate(template);
    }

    @Get('single-credential')
    fetchOneCredential(@Query() id : string) :  Observable<Credential>{
        if(!id){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return this.credentialService.getOneCredential(id);
    }

    @Get('get-my-credentials')
    getMyCredentials(@Query() email : string) : Observable<Credential[]> {
        if(!email){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return this.credentialService.getAllCredentialsOfHolder(email);
    }

    @UseGuards(AdminGuard)
    @Post('issue')
    async issueCredentials(@Req() request, credentialRequests : [CredentialRequest]) : Promise<Observable<{message : string}>> {
        const email = request.user.email;
        if(!credentialRequests){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return await this.credentialService.issueCredentials(email, credentialRequests);
    }

    @Get('get-my-requests')
    getMyPendingRequests(@Req() request : any)  : Observable<CredentialRequest[]> {
        const email = request.user.email;
        return this.credentialService.listAllRequestedCredential(email);
    }

    @UseGuards(AdminGuard)
    @Get('list-requets')
    listRequests(@Req() request : any, @Query() template : string) : Observable<CredentialRequest[]> {
        const email = request.user.email;
        if(!template){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return this.credentialService.listRequestedCredentials(template, email);
    }

    @Post('request')
    request(requestedCredentials : CredentialRequest) : Observable<{message : string, credetntialRequest : CredentialRequest }> {
        if(!requestedCredentials){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return this.credentialService.requestCredential(requestedCredentials);
    }
}
