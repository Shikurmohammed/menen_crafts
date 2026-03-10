import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';


@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private categoriesRepository: Repository<Category>,
    ) { }

    async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
        //1.Find if category with the same name already exists
        const existingCategory = await this.categoriesRepository.findOne({
            where: { name: createCategoryDto.name },
        });
        if (existingCategory) {
            throw new ConflictException(`Category ${createCategoryDto.name} already exists`);
        }
        //2.Create and save the new category
        const category = this.categoriesRepository.create(createCategoryDto);
        return await this.categoriesRepository.save(category);
    }

    async findAll(): Promise<Category[]> {
        return await this.categoriesRepository.find();
    }

    async findOne(id: number): Promise<Category> {
        const category = await this.categoriesRepository.findOne({
            where: { id },
            relations: ['crafts'],
        });
        if (!category) {
            throw new NotFoundException('Category not found');
        }
        return category;
    }

    async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        const category = await this.findOne(id);
        Object.assign(category, updateCategoryDto);
        return await this.categoriesRepository.save(category);
    }

    async remove(id: number): Promise<void> {
        const category = await this.findOne(id);
        await this.categoriesRepository.remove(category);
    }
}