import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Craft } from '../crafts/craft.entity';

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.reviews)
    user: User;

    @ManyToOne(() => Craft, craft => craft.reviews)
    craft: Craft;

    @Column({ type: 'int' })
    rating: number;

    @Column('text', { nullable: true })
    comment: string;

    @CreateDateColumn()
    createdAt: Date;
}