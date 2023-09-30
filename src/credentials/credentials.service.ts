import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CredentialEntity, CredentialRequestEntity, CredentialTemplateEntity } from './models/credential.entity';
import { Repository } from 'typeorm';
import { CredentialRequest, CredentialTemplate, Credential } from './models/credential.class';
import { PolygonService } from 'src/polygon/polygon.service';
import { Observable, from, switchMap, of, tap, map, catchError, firstValueFrom, concatMap, throwError, forkJoin } from "rxjs";

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
  * Function to check if a request with the given name and requestor email exists
  * @param {string} holder_email - email of the holder from who requested the credential
  * @param {string} template_name - name of the template
  * @returns {Observable<boolean>} An observable that emits `true` if the request exists, otherwise `false`.
  */
  doesRequestExists(holder_email : string, template_name : string) : Observable<boolean> {
    return from(this.credentialRequestRepository.findOneBy({
      holder_email: holder_email,
      template_name: template_name
    })).pipe(
      switchMap((credentialRequest : CredentialRequest)=>{
        return of(!!credentialRequest)
      })
    )
  }

  /**
  *
  * Function to check if a template with the given name and creator email exists
  * @param {string} issuer_email - email of the issuer from whome credential is requested
  * @param {string} template_name - name of the template
  * @returns {Observable<boolean>} An observable that emits `true` if the template exists, otherwise `false`.
  */
  doestTemplateExists(issuer_email : string, template_name : string) : Observable<boolean>{
    return from(this.credentialTemplateRepository.findOneBy({
      createdBy: issuer_email,
      name: template_name
    })).pipe(
      switchMap((credentialTemplate : any)=>{
        return of(!!credentialTemplate)
      })
    )
  }

 /**
 * Requests a new credential using the provided credential request object.
 * @param {CredentialRequest} credential - The credential request object.
 * @returns {Observable<{message: string, credetntialRequest: CredentialRequest}>}
 *   An observable that emits a message and the created credential request if successful.
 * @throws {HttpException} Throws exceptions if a request for the same template already exists or if the template does not exist.
 */
  requestCredential(credential: CredentialRequest) : Observable<{message : string, credetntialRequest : CredentialRequest }> {
    return this.doesRequestExists(credential.template_name,credential.issuer_email).pipe(
      tap((doesRequestExists : boolean) =>{
        if(doesRequestExists)
        throw new HttpException('A request for this template already in queue', HttpStatus.BAD_REQUEST);
      }),
      switchMap(()=>{
        return this.doestTemplateExists(credential.issuer_email, credential.template_name ).pipe(
          tap((doesTemplateExists : boolean) =>{
            if(!doesTemplateExists)
              throw new HttpException('The template you are accessing does.t exists', HttpStatus.BAD_REQUEST);

          }),
          switchMap(()=>{
            return from(
              this.credentialRequestRepository.save({
                ...credential
              })
            ).pipe(
              map((credetntialRequest : CredentialRequest) =>{
                return {
                  message : "Request Created Successfully",
                  credetntialRequest
                }
              })
            )
          })
        )
      })
    )
  }

  /**
  *
  * Function to list all the requests for a perticular issuer for a perticular template
  * @param {string} name - template name for which we want to fetch the requests
  * @param {string} email - Issuer Email for whome we want to fetch the requests
  * @returns {Observable<CredentialRequest[]>} An observable that emits an array of matching Credential Requests.
  */
  listRequestedCredentials(name: string, email: string) : Observable<CredentialRequest[]> {
    return from(
      this.credentialRequestRepository.findBy({
        template_name: name,
        issuer_email: email
      })
    )
  }

  /**
  *
  * Function to list all the  credential requests of a perticular holder
  * @param {string} holder_email - Holder Email for whome we want to fetch the requests
  * @returns {Observable<CredentialRequest[]>} An observable that emits an array of matching Credential Requests.
  */
  listAllRequestedCredential(holder_email: string) : Observable<CredentialRequest[]> {
    return from(this.credentialRequestRepository.findBy({
      holder_email: holder_email,
    }));
  }

  /**
 * Issues credentials for a given user by processing a list of credential requests.
 * @param {string} email - The email of the user for whom credentials are issued.
 * @param {CredentialRequest[]} credentialRequests - An array of credential requests to be processed.
 * @returns {Promise<Observable<{message: string}>>} A promise that resolves to an observable emitting a success message
 * when all credentials are issued successfully.
 * @throws {HttpException} Throws an exception if a credential already exists for a request or other validation errors occur.
 */
  async issueCredentials(email: string, credentialRequests: [CredentialRequest]) : Promise<Observable<{message : string}>> {
    const credentials = await this.poligonService.issueCredential(credentialRequests, email);
    
    // putting the expiration date, an year after the issuance date.
    const currentDate = new Date();
    const oneYearAfter = new Date(
      currentDate.getFullYear() + 1,
      currentDate.getMonth(),
      currentDate.getDate(),
    );

    const credentialObservables = credentials.map((credentialObj, index) => {
      return from(
        this.credentialRepository.findOneBy({
          issuer_email: email,
          holder: credentialObj.credentialSubject.id.toString(),
          schema: credentialObj.credentialSchema.id.toString(),
        })
      ).pipe(
        concatMap((existingCred) => {
          if (existingCred) {
            throw new HttpException(
                {
                  message: 'The credential already issued',
                  description: 'The credential already issued',
                },
                HttpStatus.BAD_REQUEST
              )
        
          }

          // Save the new credential
          return from(
            this.credentialRepository.save({
              credential_id: credentialObj.id,
              issuer_email: email,
              holder_email: credentialRequests[index].holder_email,
              issuer: credentialObj.issuer,
              holder: credentialObj.credentialSubject.id,
              schema: credentialObj.credentialSchema.id,
              credential: JSON.stringify(credentialObj),
              credentialIssueDate: currentDate,
              expiryDate: oneYearAfter,
            })
          ).pipe(
            concatMap(() =>
              // Delete the corresponding credential request
              from(
                this.credentialRequestRepository.delete({
                  id: credentialRequests[index].id,
                })
              )
            )
          );
        })
      );
    });

    // Use forkJoin to execute all the credential observables in parallel
    return forkJoin(credentialObservables).pipe(
      map(() => ({ message: 'Credentials Created Successfully' }))
    );
  }

  /**
  *
  * Function to list all the credentials owned by a perticular holder
  * @param {string} holder_email - Holder Email for whome we want to fetch the credentials
  * @returns {Observable<Credential[]>} An observable that emits an array of matching Credentials.
  */
  getAllCredentialsOfHolder(holder_email : string) : Observable<Credential[]> {
    return from(this.credentialRepository.findBy({
      holder_email : holder_email
    }))
  }

  /**
  *
  * Function to get a single credential
  * @param {string} id - Credential's unique id
  * @returns {Observable<Credential>} An observable that emits matching Credentials.
  */
  getOneCredential(id : string) : Observable<Credential>{
    return from(this.credentialRepository.findOneBy({
      id : id
    }))
  }

  /**
  *
  * Function to fetch all the templates created by a issuer
  * @param {string} email - Issuer Email who's all created templates we wish to fetch
  * @returns {Observable<{message : string, templates : any[]}>} An observable that emits a message for successfull fetching and an array of matching Credential Templates.
  */
  fetchAllTemplates(email: string) :Observable<{message : string, templates : any[]}> {
    return from(
      this.credentialTemplateRepository.find({
        where: { createdBy: email },
      })
    ).pipe(
      map((templates :any[])=>{
        return { message: "Succesfully fetched all templates", 
          templates
        }
      })
    )
  }

  /**
  *
  * Function to create Credential Template
  * @param {CredentialTemplate} template - The template which we wish to create
  * @returns {Observable<{message : string, templates : any}>} An observable that emits a message for successfull creation andthe created credential template.
  */
  createCredentialTemplate(template: CredentialTemplate) : Observable<{message : string, template : any}> {
    return from(
      this.credentialTemplateRepository.save({
        name: template.name,
        discription: template.discription,
        JSONurl: template.JSONurl,
        LDurl: template.LDurl,
        createdBy: template.createdBy,
        attributes: JSON.stringify(template.attributes)
      })
    ).pipe(
      map((template : any)=>{
        return { message: "Successfully Added new Credential Template",
        template
      }
      })
    )
  }
}
