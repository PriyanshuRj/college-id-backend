import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

}