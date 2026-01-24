import { Craft } from "src/crafts/craft.entity";
import { UserRole } from "src/enums/UserRole.enum";
import { Order } from "src/orders/order.entity";
import { Review } from "src/reviews/review.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @Column({ nullable: true })
    avatar: string;

    @Column({ default: false })
    isVerified: boolean;

    @OneToMany(() => Craft, craf => craf.artisan)
    crafts: Craft[];

    @OneToMany(() => Order, order => order.user)
    orders: Order[];
    @OneToMany(() => Review, review => review.user)
    reviews: Review[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}