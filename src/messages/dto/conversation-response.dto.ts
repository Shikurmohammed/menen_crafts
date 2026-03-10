import { User } from '../../users/user.entity';
import { Message } from '../message.entity';

export class ConversationResponseDto {
    id: number;
    participant: {
        id: number;
        firstName: string;
        lastName: string;
        avatar: string;
        role: string;
        isOnline?: boolean;
    };
    craft?: {
        id: number;
        title: string;
        image: string;
    };
    subject?: string;
    lastMessage?: {
        content: string;
        createdAt: Date;
        senderId: number;
        status: string;
    };
    unreadCount: number;
    updatedAt: Date;
}