import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Craft } from '../crafts/craft.entity';

@Entity('reviews')
export class Review {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, user => user.reviews, { eager: true })
    user: User;

    @ManyToOne(() => Craft, craft => craft.reviews, { eager: true })
    craft: Craft;

    @Column({ type: 'int' })
    rating: number;

    @Column('text', { nullable: true })
    comment: string;

    @Column('simple-array', { nullable: true })
    images: string[];

    @Column({ default: 'PENDING' })
    status: 'PENDING' | 'APPROVED' | 'REJECTED';

    @Column({ default: false })
    isVerifiedPurchase: boolean;

    @Column('text', { nullable: true })
    sellerResponse: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}










// @Entity('reviews')
// export class Review {
//     @PrimaryGeneratedColumn()
//     id: number;

//     @ManyToOne(() => User, user => user.reviews)
//     user: User;

//     @ManyToOne(() => Craft, craft => craft.reviews)
//     craft: Craft;

//     @Column({ type: 'int' })
//     rating: number;

//     @Column('text', { nullable: true })
//     comment: string;

//     @CreateDateColumn()
//     createdAt: Date;
// }