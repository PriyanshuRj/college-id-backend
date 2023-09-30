import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm"
import { AdminEntity, UserEntity } from "./models/user.entity";
import { Repository } from 'typeorm';
import { Observable,from, switchMap, of,tap,map, catchError } from "rxjs";
import * as bcrypt from "bcrypt";
import { Admin, User } from "./models/user.class";
import { JwtService } from "@nestjs/jwt";
import { PolygonService } from "src/polygon/polygon.service";
@Injectable()
export class AuthService{
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository : Repository<UserEntity>,
        @InjectRepository(AdminEntity)
        private readonly adminRepository : Repository<AdminEntity>,
        private readonly jwtService :  JwtService,
        private readonly polygonService : PolygonService
    ) {
        
    }
    /**
     * Hashes a password using bcrypt and returns it as an observable.
     * @param {string} password - The password to hash.
     * @returns {Observable<string>} An observable that emits the hashed password.
     */
    hashPassword(password: string) : Observable<string> {
        return from(bcrypt.hash(password, 12));
    }

    /**
     * Checks if a user with the given email exists and returns a boolean observable.
     * @param {string} email - The email to check.
     * @returns {Observable<boolean>} An observable that emits `true` if the user exists, otherwise `false`.
     */
    doesUserExist(email: string): Observable<boolean>  {
        return from(this.userRepository.findOneBy({ email })).pipe(
            switchMap((user : User)=>{
                return of(!!user);
            })
        )
    }

    /**
     * Checks if an admin with the given email exists and returns a boolean observable.
     * @param {string} email - The email to check.
     * @returns {Observable<boolean>} An observable that emits `true` if the admin exists, otherwise `false`.
     */
    doesAdminExists(email : string) : Observable<boolean> {
        return from(this.adminRepository.findOneBy({ email })).pipe(
            switchMap((admin : Admin)=>{
                return of(!!admin);
            })
        )
    }

    /**
     * Sign up a new user with the provided user object.
     * @param {User} user - The user object containing signup information.
     * @returns {Promise<Observable<User>>} A promise that resolves to an observable emitting the signed-up user.
     */
    async signup(user: User) : Promise<Observable<User>> {
        const {firstname, lastname, email, password } = user;
        const {did} = await this.polygonService.createIdentity(email);
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
                                        password : hashedPassword,
                                        DID: did,
                                        DIDString : JSON.stringify(did)
                                    })
                                ).pipe(
                                    map((user: User)=>{
                                        delete user.password;
                                        return user;
                                    })
                                )
                            })
                        )
                    }
                ) 
           
        )
    }

    /**
     * Sign up a new admin with the provided admin object.
     * @param {Admin} admin - The admin object containing signup information.
     * @returns {Promise<Observable<Admin>>} A promise that resolves to an observable emitting the signed-up admin.
     */
    async signupAsdmin(admin: Admin) : Promise<Observable<Admin>> {
        const {name, email, password } = admin;
        const {did} = await this.polygonService.createIdentity(email);
        return this.doesAdminExists(email).pipe(
            tap((doesAdminExists: boolean)=>{
                if(doesAdminExists)
                    throw new HttpException('A admin with this email already exists', HttpStatus.BAD_REQUEST);
            }),
            switchMap(()=> {
                return this.hashPassword(password).pipe(
                    switchMap((hashedPassword: string)=>{
                        return from(
                            this.adminRepository.save({
                                name,
                                email,
                                password : hashedPassword,
                                DID :did,
                                DIDString : JSON.stringify(did)
                            })
                        ).pipe(
                            map((admin: Admin)=>{
                                delete admin.password;
                                return admin;
                            })
                        )
                    })
                )
            })
        )
    }

    /**
     * Validates user credentials by comparing the provided password with the stored hashed password.
     * @param {string} email - The user's email.
     * @param {string} password - The user's password.
     * @returns {Observable<User>} An observable that emits the validated user if successful.
     * @throws {HttpException} Throws an exception if credentials are invalid.
     */
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

    /**
     * Validates admin credentials by comparing the provided password with the stored hashed password.
     * @param {string} email - The admin's email.
     * @param {string} password - The admin's password.
     * @returns {Observable<Admin>} An observable that emits the validated admin if successful.
     * @throws {HttpException} Throws an exception if credentials are invalid.
     */
    validateAdmin(email : string, password : string) : Observable<Admin> {
        return from(this.adminRepository.findOne({where : {
            email
        },
        select: ['id', 'name', 'password', 'email']
    })).pipe(
            switchMap((admin: Admin)=>{
                if(!admin){
                    throw new HttpException({
                        status: HttpStatus.FORBIDDEN,
                        error: "Invalid Credentials"
                    }, HttpStatus.FORBIDDEN)
                }
                return from(bcrypt.compare(password, admin.password)).pipe(
                    map((isValidPassword: boolean)=>{
                        if(isValidPassword) {
                            delete admin.password;
                            return admin;
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

    /**
     * Logs in a user and returns a JWT token.
     * @param {User} user - The user object containing login information.
     * @returns {Observable<string>} An observable that emits a JWT token if login is successful.
     */
    login (user : User) : Observable<string>{
        const {email, password} = user;

        return this.validateUser(email, password).pipe(
            switchMap((user : User)=> {
                return from(this.jwtService.signAsync({user}));
            })
        )
    }

    /**
     * Logs in an admin and returns a JWT token with an "isAdmin" flag.
     * @param {Admin} admin - The admin object containing login information.
     * @returns {Observable<string>} An observable that emits a JWT token if login is successful.
     */
    loginAdmin (admin : Admin) : Observable<string>{
        const {email, password} = admin;

        return this.validateAdmin(email, password).pipe(
            switchMap((admin : Admin)=> {
                const user = {...admin, isAdmin : true};
                return from(this.jwtService.signAsync({user}));
            })
        )
    }

    /**
     * Retrieves a user from a JWT token.
     * @param {string} jwt - The JWT token to decode and extract user information.
     * @returns {Observable<User | null>} An observable that emits the user if JWT is valid, otherwise null.
     */
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