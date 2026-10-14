import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalUser } from '../common/decorators/optional-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CreateNewsDto, ListNewsQueryDto, UpdateNewsDto } from './dto/news.dto';
import { NewsService } from './news.service';

@Controller('tournaments/:id/news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListNewsQueryDto,
    @OptionalUser() user: AuthUser | null,
  ) {
    return this.news.list(id, query, user);
  }

  @Post()
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateNewsDto,
  ) {
    return this.news.create(id, user, dto);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':slug')
  getBySlug(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slug') slug: string,
    @OptionalUser() user: AuthUser | null,
  ) {
    return this.news.getBySlug(id, slug, user);
  }

  @Patch(':postId')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNewsDto,
  ) {
    return this.news.update(id, postId, user, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':postId')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.news.remove(id, postId, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':postId/publish')
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.news.publish(id, postId, user);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':postId/unpublish')
  unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.news.unpublish(id, postId, user);
  }
}