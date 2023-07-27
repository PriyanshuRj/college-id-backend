import {Injectable, HttpException, HttpStatus} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PostEntity } from "../models/post.entity";
import { Repository } from "typeorm";
import {Observable, from, switchMap, of} from "rxjs"
import { PostInterface } from "../models/post.interface";
import { User } from "src/auth/models/user.class";

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(PostEntity)
        private readonly postRepository : Repository<PostEntity>) {

        
    }
    createPost(post : PostInterface, user : User) : Observable<PostInterface>{
        const {title, description} = post;
        return from(this.postRepository.save({
            title,description, author : user
        })).pipe(
            switchMap((post : PostInterface)=>{
                return of(post);
            })
        )
    }
    getPostById(postId:string) :Observable<PostInterface> {
        return from(this.postRepository.findOneBy({id:postId})).pipe(
            switchMap((post : PostInterface)=>{
                if(!post) 
                    throw new HttpException('Post Not Found', HttpStatus.BAD_REQUEST);
                return of(post);
            })
        )
    }
    getAllPosts(): Observable<PostInterface[]> {
        return from(this.postRepository.find());
    }
    getSpecificPosts(take: number = 10, skip: number = 0): Observable<PostInterface[]> {
        return from(this.postRepository.createQueryBuilder('post').innerJoinAndSelect('post.author', 'author').orderBy('post.id').take(take).skip(skip).getMany());
    }
}