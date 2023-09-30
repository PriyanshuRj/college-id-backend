export interface Credential {
    id?:string;
    name?:string;
    holder : string;
    schema : string;
    credential : string;
    credential_id : string;
    issuer_email : string;
    holder_email : string;
    credentialIssueDate ?: Date;
    expiryDate ? : Date;
}

interface Attributes{
    name : string;
    type : string;
    metadata : string;
    id : string;
}
export interface CredentialTemplate {
    id ?: string;
    name : string;
    discription: string;
    holder_email : string;
    JSONurl?:string;
    LDurl?:string;
    createdBy?: string;
    attributes: Array<Attributes>;
}
export interface CredentialRequest {
    id ?: string;
    holder_email : string;
    issuer_email : string;
    template_name : string;
    expiration: Date;
}