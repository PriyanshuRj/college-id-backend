import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('CredentialRequest')
export class CredentialEntity{
  @PrimaryGeneratedColumn()
  id : string;
  @Column()
  credential_id : string;
  @Column()
  name : string;
  @Column()
  holder : string;
  @Column()
  schema : string;
  @Column()
  credential : string;
  @Column()
  issuer_email : string;
  @Column()
  holder_email : string;
  
  @Column({nullable : true})
  credentialIssueDate: Date;

  @Column({nullable : true})
  expiryDate: Date;

}
@Entity('CredentialRequest')
export class CredentialTemplateEntity{
  @PrimaryGeneratedColumn()
  id : string;

  @Column()
  name : string;
  @Column({nullable: true})
  discription: string;
  @Column()
  JSONurl:string;
  @Column()
  LDurl:string;
  @Column()
  createdBy: string;
  @Column()
  attributes: string;

}
@Entity('CredentialRequest')
export class CredentialRequestEntity{
  @PrimaryGeneratedColumn()
  id : string;
  @Column()
  holder_email : string;
  @Column()
  issuer_email : string;
  @Column()
  template_name : string;
  @Column()
  expiration: Date;

}