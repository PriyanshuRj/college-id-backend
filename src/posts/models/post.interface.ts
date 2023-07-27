import { User } from "src/auth/models/user.class";

export interface PostInterface {
    id?: string;
    title?: string;
    description?: string;
    author : User;
}