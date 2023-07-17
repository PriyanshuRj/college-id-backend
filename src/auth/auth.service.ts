import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"
import { UserEntity } from "./models/user.entity";
import { Repository } from 'typeorm';
import { Observable,from, switchMap, of,tap,map, catchError } from "rxjs";
import * as bcrypt from "bcrypt";
import { User } from "./models/user.class";
import { JwtService } from "@nestjs/jwt";
@Injectable()
export class AuthService{
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository : Repository<UserEntity>,
        private readonly jwtService :  JwtService
    ) {
        
    }
    hashPassword(password: string) : Observable<string> {
        return from(bcrypt.hash(password, 12));
    }

    doesUserExist(email: string): Observable<boolean>  {
        return from(this.userRepository.findOneBy({ email })).pipe(
            switchMap((user : User)=>{
                return of(!!user);
            })
        )
    }
    signup(user: User) : Observable<User> {
        const {firstname, lastname, email, password } = user;
        return this.doesUserExist(email).pipe(
            tap((doesUserExists: boolean)=>{
                if(doesUserExists)
                    throw new HttpException('A user with this email already exists', HttpStatus.BAD_REQUEST);
            }),
            switchMap(()=> {
                return this.hashPassword(password).pipe(
                    switchMap((hashedPassword: string)=>{
                        return from(
                            this.userRepository.save({
                                firstname,
                                lastname,
                                email,
                                password : hashedPassword
                            })
                        ).pipe(
                            map((user: User)=>{
                                delete user.password;
                                return user;
                            })
                        )
                    })
                )
            })
        )
    }
    validateUser(email : string, password : string) : Observable<User> {
        return from(this.userRepository.findOne({where : {
            email
        },
        select: ['id', 'firstname', 'lastname', 'password', 'email']
    })).pipe(
            switchMap((user: User)=>{
                if(!user){
                    throw new HttpException({
                        status: HttpStatus.FORBIDDEN,
                        error: "Invalid Credentials"
                    }, HttpStatus.FORBIDDEN)
                }
                return from(bcrypt.compare(password, user.password)).pipe(
                    map((isValidPassword: boolean)=>{
                        if(isValidPassword) {
                            delete user.password;
                            return user;
                        }
                        else throw new HttpException({
                            status: HttpStatus.FORBIDDEN,
                            eoor: "Invalid credentials"
                        }, HttpStatus.FORBIDDEN);
                    })
                )
            })
        )
    }

    login (user : User) : Observable<string>{
        const {email, password} = user;

        return this.validateUser(email, password).pipe(
            switchMap((user : User)=> {
                return from(this.jwtService.signAsync({user}));
            })
        )
    }

    getHWTUser(jwt: string) : Observable<User | null> {
        return from (this.jwtService.verifyAsync(jwt)).pipe(
            map((user: User)=>{
                return user;
            }),
            catchError(() =>{
                return of(null);
            })
        )
    }
}