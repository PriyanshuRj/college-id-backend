import { IsEmail, IsString } from "class-validator";

export class User {
    id: string;
    @IsEmail()
    email?:string;
    firstname?:string;
    lastname?:string;
    @IsString()
    password?:string;

}

export class Admin{
    id: string;
    @IsEmail()
    email: string;
    name: string;
    
    @IsString()
    password: string;
}