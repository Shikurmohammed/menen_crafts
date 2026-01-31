import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { Craft } from '../crafts/craft.entity';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ nullable: true })
    image: string;

    @ManyToMany(() => Craft, craft => craft.categories)
    crafts: Craft[];
}