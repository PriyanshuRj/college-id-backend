import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CredentialEntity, CredentialRequestEntity, CredentialTemplateEntity } from './models/credential.entity';
import { Repository } from 'typeorm';
import { CredentialRequest, CredentialTemplate } from './models/credential.class';
import { PolygonService } from 'src/polygon/polygon.service';

@Injectable()
export class CredentialsService {
  constructor(
    @InjectRepository(CredentialEntity)
    private readonly credentialRepository: Repository<CredentialEntity>,

    @InjectRepository(CredentialRequestEntity)
    private readonly credentialRequestRepository: Repository<CredentialRequestEntity>,

    @InjectRepository(CredentialTemplateEntity)
    private readonly credentialTemplateRepository: Repository<CredentialTemplateEntity>,

    private readonly poligonService: PolygonService
  ) { }

  /**
  *
  * Function to create a credential request
  * @param {CredentialRequest} credential - credential request that has been sent
  */
  async requestCredential(credential: CredentialRequest) {
    const previousRequests = await this.credentialRequestRepository.findBy({
      holder_email: credential.holder_email,
      template_name: credential.template_name
    })
    if (previousRequests.length) return { message: "Request for this credential already in Queue" };
    const template = await this.credentialTemplateRepository.findOneBy({
      name: credential.template_name,
      createdBy: credential.issuer_email
    })
    if (!template) return { message: "No template with this specification found" };

    await this.credentialRequestRepository.save({
      ...credential
    })
    return { message: "Request saved !" }
  }

  /**
  *
  * Function to list al the requests for a perticular issuer for a perticular template
  * @param {string} name - template name for which we want to fetch the requests
  * @param {string} email - Issuer Email for whome we want to fetch the requests
  */
  async listRequestedCredentials(name: string, email: string) {
    const requestedTemplates = await this.credentialRequestRepository.findBy({
      template_name: name,
      issuer_email: email
    })
    return requestedTemplates;
  }

  /**
  *
  * Function to list all the  credential requests of a perticular holder
  * @param {string} holder_email - Holder Email for whome we want to fetch the requests
  */
  async listAllRequestedCredential(holder_email: string) {
    const requestedCredentials = await this.credentialRequestRepository.findBy({
      holder_email: holder_email,
    });
    return requestedCredentials;
  }

  /**
  *
  * Function to issue a credential to a perticular holder
  * @param {string} email - Issuer Email who is issuing the given credentials
  * @param {[CredentialRequest]} credentialRequests - List of all the requested credentials
  */
  async issueCredentials(email: string, credentialRequests: [CredentialRequest]) {
    const credentials = await this.poligonService.issueCredential(credentialRequests, email);
    
    // putting the expiration date, an year after the issuance date.
    const currentDate = new Date();
    const oneYearAfter = new Date(
      currentDate.getFullYear() + 1,
      currentDate.getMonth(),
      currentDate.getDate(),
    );

    for (let i = 0; i < credentials.length; i++) {
      
      const credentialObj = credentials[i];
      const exisitingCred = await this.credentialRepository.findOneBy({
        issuer_email: email,
        holder: credentialObj.credentialSubject.id.toString(),
        schema: credentialObj.credentialSchema.id.toString(),
      });


      if (exisitingCred) {
        throw new HttpException(
          {
            message: 'The credential already issued',
            description: 'The credential already issued',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.credentialRepository.save({
        credential_id: credentialObj.id,
        issuer_email: email,
        holder_email: credentialRequests[i].holder_email,
        issuer: credentialObj.issuer,
        holder: credentialObj.credentialSubject.id,
        schema: credentialObj.credentialSchema.id,
        credential: JSON.stringify(credentialObj),
        credentialIssueDate : currentDate,
        expiryDate : oneYearAfter,
      })

      

      await this.credentialRequestRepository.delete({
        id: credentialRequests[i].id
      })
    }
  }

  /**
  *
  * Function to list all the credentials owned by a perticular holder
  * @param {string} holder_email - Holder Email for whome we want to fetch the credentials
  */
  async getAllCredentialsOfHolder(holder_email : string){
    const credentials = await this.credentialRepository.findBy({
      holder_email : holder_email
    })
    return credentials;
  }

  /**
  *
  * Function to get a single credential
  * @param {string} id - Credential's unique id
  */
  async getOneCredential(id : string){
    const credential = await this.credentialRepository.findOneBy({
      id : id
    })
    return credential;
  }
  /**
  *
  * Function to fetch all the templates created by a issuer
  * @param {string} email - Issuer Email who's all created templates we wish to fetch
  */
  async fetchAllTemplates(email: string) {

    try {
      const allTemplates = await this.credentialTemplateRepository.find({
        where: { createdBy: email },
      });

      return { message: "Succesfully fetched all templates", templates: allTemplates }
    }
    catch (err) {
      console.error(err)
      return { "error": err }
    }
  }

  /**
  *
  * Function to create Credential Template
  * @param {CredentialTemplate} template - The template which we wish to create
  */
  async createCredentialTemplate(template: CredentialTemplate) {
    await this.credentialTemplateRepository.save({
      name: template.name,
      discription: template.discription,
      JSONurl: template.JSONurl,
      LDurl: template.LDurl,
      createdBy: template.createdBy,
      attributes: JSON.stringify(template.attributes)
    });
    return { message: "Successfully Added new Credential Template" }
  }
}
