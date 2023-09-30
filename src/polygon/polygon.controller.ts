import { Controller, Get, Post, Body,Req,UseGuards,Patch, Query, Delete } from '@nestjs/common';
import { PolygonService } from './polygon.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
@Controller('polygon')
export class PolygonController {
  constructor(private readonly polygonService: PolygonService) {}
}
