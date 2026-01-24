import { User } from "src/users/user.entity";
import { BeforeInsert, Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { OrderItem } from "./order-item.entity";
export enum OrderStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled'
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    orderNumber: string;

    @ManyToOne(() => User, user => user.orders, { eager: true })
    user: User;

    @Column()
    userId: string;

    @OneToMany(() => OrderItem, orderItem => orderItem.order, {
        cascade: true,
        eager: true
    })
    items: OrderItem[];

    @Column('decimal', { precision: 10, scale: 2 })
    totalAmount: number;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING
    })
    status: OrderStatus;

    @Column({ type: 'text', nullable: true })
    shippingAddress: string;

    @Column({ type: 'text', nullable: true })
    billingAddress: string;

    @Column({ nullable: true })
    trackingNumber: string;

    @Column({ nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ nullable: true })
    completedAt: Date;

    @BeforeInsert()
    generateOrderNumber() {
        // Generate order number like ORD-20240115-0001
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.orderNumber = `ORD-${date}-${random}`;
    }

    calculateTotal(): number {
        if (!this.items || this.items.length === 0) {
            return 0;
        }
        return this.items.reduce((total, item) => total + item.subtotal, 0);
    }
}