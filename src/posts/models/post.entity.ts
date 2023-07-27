import { UserEntity } from "src/auth/models/user.entity";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn,  } from "typeorm";

@Entity('post')
export class PostEntity {
    @PrimaryGeneratedColumn()
    id : string;

    @Column({nullable: false})
    title : string;

    @Column({nullable : true})
    description : string;

    @ManyToOne(() => UserEntity, (userEntity)=> userEntity.posts)
    author : UserEntity;
}