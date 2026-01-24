import { Column, CreateDateColumn, Entity, ManyToOne, UpdateDateColumn, PrimaryGeneratedColumn } from "typeorm";
import { Order } from "./order.entity";
import { Craft } from "src/crafts/craft.entity";

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
    order: Order;
    @ManyToOne(() => Craft, craft => craft.orderItems, { eager: true })
    craft: Craft;

    @Column()
    craftId: number;
    @Column()
    quantity: number;
    @Column('decimal', { precision: 10, scale: 2 })
    unitPrice: number;
    @Column('decimal', { precision: 10, scale: 2 })
    subtotal: number;
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}