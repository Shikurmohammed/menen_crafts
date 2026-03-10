import { 
    Entity, 
    Column, 
    PrimaryGeneratedColumn, 
    ManyToOne, 
    OneToMany, 
    CreateDateColumn,
    UpdateDateColumn,
    Index 
} from 'typeorm';
import { User } from '../users/user.entity';
import { Message } from './message.entity';
import { Craft } from '../crafts/craft.entity';

export enum ConversationStatus {
    ACTIVE = 'active',
    ARCHIVED = 'archived',
    BLOCKED = 'blocked',
}

@Entity('conversations')
@Index(['participant1', 'participant2'])
export class Conversation {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { eager: true })
    participant1: User;

    @Column()
    participant1Id: number;

    @ManyToOne(() => User, { eager: true })
    participant2: User;

    @Column()
    participant2Id: number;

    @ManyToOne(() => Craft, { nullable: true })
    craft: Craft;

    @Column({ nullable: true })
    craftId: number;

    @Column({ nullable: true })
    subject: string;

    @Column({
        type: 'enum',
        enum: ConversationStatus,
        default: ConversationStatus.ACTIVE,
    })
    status: ConversationStatus;

    @Column({ nullable: true })
    lastMessageAt: Date;

    @Column({ nullable: true })
    lastMessagePreview: string;

    @Column({ default: false })
    participant1Deleted: boolean;

    @Column({ default: false })
    participant2Deleted: boolean;

    @OneToMany(() => Message, message => message.conversation)
    messages: Message[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}