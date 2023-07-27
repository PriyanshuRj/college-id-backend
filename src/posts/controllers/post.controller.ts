import { Controller, Post, Body, UseGuards, Request, Get, Param, Query } from "@nestjs/common";
import { PostService } from "../services/post.service";
import { JwtGuard } from "src/auth/guards/jwt.guard";
import { PostInterface } from "../models/post.interface";

@Controller("posts")
export class PostController{
    constructor(private postService : PostService) {
        
    }
    @UseGuards(JwtGuard)
    @Post()
    addPost(@Body() post : PostInterface, @Request() req){
        return this.postService.createPost(post, req.user);
    }
    
    @Get('single/:postId')
    getPost(@Param(":postId") postId: string){
        return this.postService.getPostById(postId);
    }
    @Get('all')
    getAllPosts(){
        return this.postService.getAllPosts();
    }
    @Get('')
    getTakenPosts(@Query('take') take : number = 1, @Query('skip') skip : number = 1){
        return this.postService.getSpecificPosts(take,skip);
    }

}