import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Craft } from '../crafts/craft.entity';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Craft, User, Category]),
    ],
    controllers: [SearchController],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule {}