import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';

@Entity('user')
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({ unique : true})
    email: string;

    @Column({ select : false})
    password: string;

    @Column()
    firstname: string;

    @Column()
    lastname: string;

    @Column({nullable : true})
    DIDString : string;
  
    @Column({nullable : true})
    DID : string
}

@Entity('admin')
export class AdminEntity {
    @PrimaryGeneratedColumn()
    id: string;

    @Column({ unique : true})
    email: string;

    @Column({ select : false})
    password: string;

    @Column()
    name: string;

    @Column({nullable : true})
    DIDString : string;
  
    @Column({nullable : true})
    DID : string;
}