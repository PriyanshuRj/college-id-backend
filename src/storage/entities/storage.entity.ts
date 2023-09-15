import { Entity, Column, PrimaryColumn, OneToMany,BaseEntity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('storage')
export class StorageEntity extends BaseEntity{
    @PrimaryColumn({ unique: true })
    key : string;

    @Column()
    value : string;
}

@Entity('dids')
export class DIDEntity extends BaseEntity{
    @PrimaryGeneratedColumn()
    _id : string;

    @Column()
    email : string;

    @Column()
    did:  string;

}