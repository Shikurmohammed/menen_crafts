import { 
    Injectable, 
    NotFoundException, 
    BadRequestException, 
    ForbiddenException,
    Logger 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not, Brackets } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { Message, MessageStatus } from './message.entity';
import { User } from '../users/user.entity';
import { Craft } from '../crafts/craft.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { EmailService } from '../email/email.service';
import { MessagesGateway } from './messages.gateway';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@Injectable()
export class MessagesService {
    private readonly logger = new Logger(MessagesService.name);

    constructor(
        @InjectRepository(Conversation)
        private conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private messageRepository: Repository<Message>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Craft)
        private craftRepository: Repository<Craft>,
        private emailService: EmailService,
        private messagesGateway: MessagesGateway,
    ) {}

    /**
     * Get all conversations for a user
     */
    async getUserConversations(
        userId: number,
        page: number = 1,
        limit: number = 20,
    ): Promise<{ conversations: ConversationResponseDto[]; total: number }> {
        const skip = (page - 1) * limit;

        const queryBuilder = this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.participant1', 'participant1')
            .leftJoinAndSelect('conversation.participant2', 'participant2')
            .leftJoinAndSelect('conversation.craft', 'craft')
            .leftJoinAndSelect('conversation.messages', 'messages')
            .where(
                '(conversation.participant1Id = :userId AND conversation.participant1Deleted = false) OR ' +
                '(conversation.participant2Id = :userId AND conversation.participant2Deleted = false)',
                { userId }
            )
            .orderBy('conversation.lastMessageAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [conversations, total] = await queryBuilder.getManyAndCount();

        // Get unread counts for each conversation
        const enhancedConversations = await Promise.all(
            conversations.map(async conv => {
                const unreadCount = await this.messageRepository.count({
                    where: {
                        conversation: { id: conv.id },
                        senderId: Not(userId),
                        status: Not(MessageStatus.READ),
                    },
                });

                const otherParticipant = 
                    conv.participant1Id === userId ? conv.participant2 : conv.participant1;

                return {
                    id: conv.id,
                    participant: {
                        id: otherParticipant.id,
                        firstName: otherParticipant.firstName,
                        lastName: otherParticipant.lastName,
                        avatar: otherParticipant.avatar,
                        role: otherParticipant.role,
                    },
                    craft: conv.craft ? {
                        id: conv.craft.id,
                        title: conv.craft.title,
                        image: conv.craft.images?.[0],
                    } : null,
                    subject: conv.subject,
                    lastMessage: conv.messages?.length ? {
                        content: conv.messages[conv.messages.length - 1]?.content,
                        createdAt: conv.lastMessageAt,
                        senderId: conv.messages[conv.messages.length - 1]?.senderId,
                        status: conv.messages[conv.messages.length - 1]?.status,
                    } : null,
                    unreadCount,
                    updatedAt: conv.updatedAt,
                };
            })
        );

        return { conversations: enhancedConversations, total };
    }

    /**
     * Get messages for a conversation
     */
    async getConversationMessages(
        conversationId: number,
        userId: number,
        page: number = 1,
        limit: number = 50,
    ): Promise<{ messages: Message[]; total: number; conversation: Conversation }> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participant1', 'participant2', 'craft'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Verify user is part of conversation
        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            throw new ForbiddenException('You are not part of this conversation');
        }

        const skip = (page - 1) * limit;

        const [messages, total] = await this.messageRepository.findAndCount({
            where: { conversation: { id: conversationId } },
            relations: ['sender'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        // Mark messages as read
        await this.messageRepository.update(
            {
                conversation: { id: conversationId },
                senderId: Not(userId),
                status: Not(MessageStatus.READ),
            },
            { status: MessageStatus.READ, readAt: new Date() }
        );

        return { messages: messages.reverse(), total, conversation };
    }

    /**
     * Start a new conversation
     */
    async startConversation(
        sender: User,
        createConversationDto: CreateConversationDto,
    ): Promise<Conversation> {
        const { recipientId, craftId, subject, initialMessage } = createConversationDto;

        // Check if recipient exists
        const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
        if (!recipient) {
            throw new NotFoundException('Recipient not found');
        }

        // Prevent self-messaging
        if (sender.id === recipientId) {
            throw new BadRequestException('Cannot start conversation with yourself');
        }

        // Check if craft exists (if provided)
        let craft = null;
        if (craftId) {
            craft = await this.craftRepository.findOne({ 
                where: { id: craftId },
                relations: ['artisan'],
            });
            if (!craft) {
                throw new NotFoundException('Craft not found');
            }
        }

        // Check if conversation already exists
        const existingConversation = await this.conversationRepository.findOne({
            where: [
                { participant1Id: sender.id, participant2Id: recipientId },
                { participant1Id: recipientId, participant2Id: sender.id },
            ],
        });

        if (existingConversation) {
            // If conversation exists, just add a new message
            await this.sendMessage(sender, {
                conversationId: existingConversation.id,
                content: initialMessage,
            });
            return existingConversation;
        }

        // Create new conversation
        const conversation = this.conversationRepository.create({
            participant1: sender,
            participant1Id: sender.id,
            participant2: recipient,
            participant2Id: recipient.id,
            craft,
            craftId: craft?.id,
            subject,
            lastMessageAt: new Date(),
        });

        const savedConversation = await this.conversationRepository.save(conversation);

        // Create initial message
        const message = this.messageRepository.create({
            conversation: savedConversation,
            sender,
            content: initialMessage,
            status: MessageStatus.SENT,
        });

        await this.messageRepository.save(message);

        // Update last message preview
        savedConversation.lastMessagePreview = initialMessage.substring(0, 100);
        await this.conversationRepository.save(savedConversation);

        // Send real-time notification
        this.messagesGateway.sendNewMessageNotification(
            recipientId.toString(),
            {
                conversationId: savedConversation.id,
                senderName: `${sender.firstName} ${sender.lastName}`,
                content: initialMessage,
            }
        );

        // Send email notification
        try {
            await this.emailService.sendNewMessageNotification(recipient.email, {
                recipientName: recipient.firstName,
                senderName: `${sender.firstName} ${sender.lastName}`,
                content: initialMessage,
                conversationId: savedConversation.id,
            });
        } catch (error) {
            this.logger.error('Failed to send email notification:', error);
        }

        return savedConversation;
    }

    /**
     * Send a message in an existing conversation
     */
    async sendMessage(sender: User, sendMessageDto: SendMessageDto): Promise<Message> {
        const { conversationId, content, attachments } = sendMessageDto;

        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participant1', 'participant2'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Verify user is part of conversation
        if (conversation.participant1Id !== sender.id && conversation.participant2Id !== sender.id) {
            throw new ForbiddenException('You are not part of this conversation');
        }

        // Create message
        const message = this.messageRepository.create({
            conversation,
            sender,
            content,
            attachments,
            status: MessageStatus.SENT,
        });

        const savedMessage = await this.messageRepository.save(message);

        // Update conversation
        conversation.lastMessageAt = new Date();
        conversation.lastMessagePreview = content.substring(0, 100);
        await this.conversationRepository.save(conversation);

        // Get recipient
        const recipientId = conversation.participant1Id === sender.id 
            ? conversation.participant2Id 
            : conversation.participant1Id;

        // Send real-time notification
        this.messagesGateway.sendNewMessage(
            recipientId.toString(),
            {
                id: savedMessage.id,
                conversationId,
                senderId: sender.id,
                senderName: `${sender.firstName} ${sender.lastName}`,
                content,
                createdAt: savedMessage.createdAt,
            }
        );

        return savedMessage;
    }

    /**
     * Mark messages as read
     */
    async markAsRead(userId: number, conversationId: number): Promise<void> {
        await this.messageRepository.update(
            {
                conversation: { id: conversationId },
                senderId: Not(userId),
                status: Not(MessageStatus.READ),
            },
            { status: MessageStatus.READ, readAt: new Date() }
        );

        // Notify sender that messages were read
        this.messagesGateway.sendReadReceipt(conversationId, userId);
    }

    /**
     * Archive conversation
     */
    async archiveConversation(userId: number, conversationId: number): Promise<void> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        if (conversation.participant1Id === userId) {
            conversation.participant1Deleted = true;
        } else if (conversation.participant2Id === userId) {
            conversation.participant2Deleted = true;
        } else {
            throw new ForbiddenException('You are not part of this conversation');
        }

        await this.conversationRepository.save(conversation);
    }

    /**
     * Delete conversation (soft delete)
     */
    async deleteConversation(userId: number, conversationId: number): Promise<void> {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Verify user is part of conversation
        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            throw new ForbiddenException('You are not part of this conversation');
        }

        // Soft delete - mark as deleted for this user
        if (conversation.participant1Id === userId) {
            conversation.participant1Deleted = true;
        } else {
            conversation.participant2Deleted = true;
        }

        // If both users have deleted, actually delete the conversation
        if (conversation.participant1Deleted && conversation.participant2Deleted) {
            await this.conversationRepository.remove(conversation);
        } else {
            await this.conversationRepository.save(conversation);
        }
    }

    /**
     * Get unread count for user
     */
    async getUnreadCount(userId: number): Promise<number> {
        const conversations = await this.conversationRepository.find({
            where: [
                { participant1Id: userId, participant1Deleted: false },
                { participant2Id: userId, participant2Deleted: false },
            ],
        });

        const conversationIds = conversations.map(c => c.id);

        if (conversationIds.length === 0) {
            return 0;
        }

        return this.messageRepository.count({
            where: {
                conversation: { id: In(conversationIds) },
                senderId: Not(userId),
                status: Not(MessageStatus.READ),
            },
        });
    }
}