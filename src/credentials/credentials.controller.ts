import { Controller, Get, UseGuards, Req, Post, Query, HttpException, HttpStatus } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import { AdminGuard } from 'src/auth/guards/admin.gurad';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { CredentialRequest, CredentialTemplate } from './models/credential.class';

@Controller('credentials')
@UseGuards(JwtGuard)
export class CredentialsController {
    constructor (private readonly credentialService : CredentialsService) {}
    
    @UseGuards(AdminGuard)
    @Get()
    async call(@Req() request){
        return request.user;
    }

    
    @UseGuards(AdminGuard)
    @Get('templates')
    async getAllTemplates(@Req() request){
        const email = request.user.email;
        return await this.credentialService.fetchAllTemplates(email);
    }

    @UseGuards(AdminGuard)
    @Post('create-template')
    async createTemplate(template : CredentialTemplate){
        if(!template){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return await this.credentialService.createCredentialTemplate(template);
    }

    @Get('single-credential')
    async fetchOneCredential(@Query() id : string){
        if(!id){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return await this.credentialService.getOneCredential(id);
    }

    @Get('get-my-credentials')
    async getMyCredentials(@Query() email : string){
        if(!email){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return await this.credentialService.getAllCredentialsOfHolder(email);
    }

    @UseGuards(AdminGuard)
    @Post('issue')
    async issueCredentials(@Req() request, credentialRequests : [CredentialRequest]){
        const email = request.user.email;
        if(!credentialRequests){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return await this.credentialService.issueCredentials(email, credentialRequests);
    }

    @Get('get-my-requests')
    async getMyPendingRequests(@Req() request){
        const email = request.user.email;
        return await this.credentialService.listAllRequestedCredential(email);
    }

    @UseGuards(AdminGuard)
    @Get('list-requets')
    async listRequests(@Req() request, @Query() template : string){
        const email = request.user.email;
        if(!template){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return await this.credentialService.listRequestedCredentials(template, email);
    }

    @Post('request')
    async request(requestedCredentials : CredentialRequest){
        if(!requestedCredentials){
            throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST)
        }
        return await this.credentialService.requestCredential(requestedCredentials);
    }
}
