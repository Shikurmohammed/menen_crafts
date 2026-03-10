/* eslint-disable @typescript-eslint/no-explicit-any */
import { Category } from "src/categories/category.entity";
import { OrderItem } from "src/orders/order-item.entity";
import { Review } from "src/reviews/review.entity";
import { User } from "src/users/user.entity";
import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('crafts')
export class Craft {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column('text')
    description: string;

    @Column('decimal', { precision: 10, scale: 2 })
    price: number;

    @Column('simple-array')
    images: string[];

    @Column({ default: 0 })
    stock: number;

    @Column({ default: true })
    isAvailable: boolean;

    @Column({ default: 0 })
    views: number;

    @Column('jsonb', { nullable: true })
    specifications: Record<string, any>;

    @ManyToOne(() => User, user => user.crafts)
    artisan: User;

    @ManyToMany(() => Category)
    @JoinTable()
    categories: Category[];


    @OneToMany(() => OrderItem, orderItem => orderItem.craft)
    orderItems: OrderItem[];

    @OneToMany(() => Review, review => review.craft)
    reviews: Review[];

    @Column({ default: 0 })
    averageRating: number;

     // New fields
    @Column({ nullable: true })
    region?: string;

    @Column('text', { nullable: true })
    culturalSignificance?: string;

    @Column({ nullable: true })
    estimatedDelivery?: string; // e.g., "3-7 days"

    @Column({ default: false })
    isTraditional: boolean;

    @Column({ nullable: true })
    materialSource?: string; // e.g., "Ethiopian cotton"

    @Column({ nullable: true })
    craftType?: string; // e.g., "woven", "carved"

    @Column({ default: false })
    freeDelivery: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}