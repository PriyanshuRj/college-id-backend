import { IsEmail, IsString } from "class-validator";
import { PostInterface } from "src/posts/models/post.interface";

export class User {
    id?: string;
    @IsEmail()
    email?:string;
    firstname?:string;
    lastname?:string;
    @IsString()
    password?:string;
    posts : PostInterface[];

}