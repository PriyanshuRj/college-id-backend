import { PostEntity } from 'src/posts/models/post.entity';
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

    @OneToMany(()=>PostEntity, (post)=> post.author)
    posts : PostEntity[];

}