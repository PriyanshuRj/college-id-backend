import { Module } from "@nestjs/common";
import { PostService } from "./services/post.service";
import { PostController } from "./controllers/post.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostEntity } from "./models/post.entity";

@Module({
    imports: [
        TypeOrmModule.forFeature([PostEntity])
    ],
    providers: [PostService],
    controllers: [PostController],
    exports: []
})

export class PostModule {}