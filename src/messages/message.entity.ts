import { 
    Entity, 
    Column, 
    PrimaryGeneratedColumn, 
    ManyToOne, 
    CreateDateColumn,
    UpdateDateColumn,
    Index 
} from 'typeorm';
import { User } from '../users/user.entity';
import { Conversation } from './conversation.entity';

export enum MessageStatus {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
}

@Entity('messages')
@Index(['conversation', 'createdAt'])
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Conversation, conversation => conversation.messages, { onDelete: 'CASCADE' })
    conversation: Conversation;

    @Column()
    conversationId: number;

    @ManyToOne(() => User, { eager: true })
    sender: User;

    @Column()
    senderId: number;

    @Column('text')
    content: string;

    @Column({ default: false })
    isSystemMessage: boolean;

    @Column({
        type: 'enum',
        enum: MessageStatus,
        default: MessageStatus.SENT,
    })
    status: MessageStatus;

    @Column({ nullable: true })
    readAt: Date;

    @Column('simple-json', { nullable: true })
    attachments: Array<{
        url: string;
        type: string;
        name: string;
        size: number;
    }>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}