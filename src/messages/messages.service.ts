import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Conversation, ConversationStatus } from './conversation.entity';
import { Message, MessageStatus } from './message.entity';
import { User } from '../users/user.entity';
import { Craft } from '../crafts/craft.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { EmailService } from '../email/email.service';
import { MessagesGateway } from './messages.gateway';

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
        @Inject(forwardRef(() => MessagesGateway))
        private messagesGateway: MessagesGateway,
    ) { }


    async getUserById(userId: number): Promise<User> {
       // this.logger.log(`🔍 Getting user by ID: ${userId}`);
        const user = await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'firstName', 'lastName', 'avatar', 'role']
        });

        if (!user) {
            this.logger.error(`❌ User ${userId} not found`);
            throw new NotFoundException('User not found');
        }

      //  this.logger.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
        return user;
    }

    /**
     * Get all conversations for a user
     */
    async getUserConversations(
        userId: number,
        page: number = 1,
        limit: number = 20,
    ): Promise<{ conversations: ConversationResponseDto[]; total: number }> {
        //this.logger.log(`📋 Getting conversations for user ${userId} (page: ${page}, limit: ${limit})`);
        
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
        //this.logger.log(`📋 Found ${conversations.length} conversations for user ${userId}`);

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

                // Get online status from gateway
                const isOnline = this.messagesGateway.isUserOnline(otherParticipant.id);
                //this.logger.log(`👤 User ${otherParticipant.id} (${otherParticipant.firstName}) online status: ${isOnline}`);

                return {
                    id: conv.id,
                    participant: {
                        id: otherParticipant.id,
                        firstName: otherParticipant.firstName,
                        lastName: otherParticipant.lastName,
                        avatar: otherParticipant.avatar,
                        role: otherParticipant.role,
                        isOnline,
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
        //this.logger.log(`💬 Getting messages for conversation ${conversationId} (user: ${userId})`);
        
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participant1', 'participant2', 'craft'],
        });

        if (!conversation) {
            this.logger.error(`❌ Conversation ${conversationId} not found`);
            throw new NotFoundException('Conversation not found');
        }

        // Verify user is part of conversation
        if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
            this.logger.error(`❌ User ${userId} is not part of conversation ${conversationId}`);
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

      //  this.logger.log(`💬 Found ${messages.length} messages for conversation ${conversationId}`);

        // Mark messages as read
        const unreadMessages = await this.messageRepository.find({
            where: {
                conversation: { id: conversationId },
                senderId: Not(userId),
                status: Not(MessageStatus.READ),
            },
        });

        if (unreadMessages.length > 0) {
           // this.logger.log(`👁️ Marking ${unreadMessages.length} messages as read in conversation ${conversationId}`);
            
            const messageIds = unreadMessages.map(m => m.id);

            await this.messageRepository.update(
                { id: In(messageIds) },
                { status: MessageStatus.READ, readAt: new Date() }
            );

            // Notify sender via WebSocket
            const otherParticipantId = conversation.participant1Id === userId
                ? conversation.participant2Id
                : conversation.participant1Id;

          //  this.logger.log(`📢 Sending read receipt to user ${otherParticipantId}`);
            this.messagesGateway.sendReadReceipt(conversationId, userId);
        }

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
        
        //this.logger.log(`🆕 Starting conversation from user ${sender.id} to user ${recipientId}`);

        // Check if recipient exists
        const recipient = await this.userRepository.findOne({ where: { id: recipientId } });
        if (!recipient) {
            this.logger.error(`❌ Recipient ${recipientId} not found`);
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
            relations: ['participant1', 'participant2', 'craft', 'messages'],
        });

        if (existingConversation) {
           // this.logger.log(`📝 Conversation already exists (ID: ${existingConversation.id}), adding message`);
            
            // If conversation exists, just add a new message
            const message = await this.sendMessage(sender, {
                conversationId: existingConversation.id,
                content: initialMessage,
            });

            // Notify via WebSocket
            this.messagesGateway.sendNewMessage(
                recipientId.toString(),
                {
                    id: message.id,
                    conversationId: existingConversation.id,
                    senderId: sender.id,
                    senderName: `${sender.firstName} ${sender.lastName}`,
                    content: initialMessage,
                    createdAt: message.createdAt,
                }
            );

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
        //this.logger.log(`✅ Created new conversation with ID: ${savedConversation.id}`);

        // Create initial message
        const message = this.messageRepository.create({
            conversation: savedConversation,
            sender,
            content: initialMessage,
            status: MessageStatus.SENT,
        });

        await this.messageRepository.save(message);
       // this.logger.log(`✅ Created initial message with ID: ${message.id}`);

        // Update last message preview
        savedConversation.lastMessagePreview = initialMessage.substring(0, 100);
        await this.conversationRepository.save(savedConversation);

        // Send real-time notification via WebSocket
        //this.logger.log(`📢 Sending new conversation notification to user ${recipientId}`);
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
        
        //this.logger.log(`📨 Sending message in conversation ${conversationId} from user ${sender.id}`);

        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participant1', 'participant2'],
        });

        if (!conversation) {
            this.logger.error(`❌ Conversation ${conversationId} not found`);
            throw new NotFoundException('Conversation not found');
        }

        // Verify user is part of conversation
        if (conversation.participant1Id !== sender.id && conversation.participant2Id !== sender.id) {
            this.logger.error(`❌ User ${sender.id} is not part of conversation ${conversationId}`);
            throw new ForbiddenException('You are not part of this conversation');
        }

        // Determine if recipient is online
        const recipientId = conversation.participant1Id === sender.id
            ? conversation.participant2Id
            : conversation.participant1Id;

        const isRecipientOnline = this.messagesGateway.isUserOnline(recipientId);
        //this.logger.log(`📱 Recipient ${recipientId} online status: ${isRecipientOnline}`);

        // Create message
        const message = this.messageRepository.create({
            conversation,
            sender,
            content,
            attachments,
            status: isRecipientOnline ? MessageStatus.DELIVERED : MessageStatus.SENT,
        });

        const savedMessage = await this.messageRepository.save(message);
        //this.logger.log(`✅ Message saved with ID: ${savedMessage.id}`);

        // Update conversation
        conversation.lastMessageAt = new Date();
        conversation.lastMessagePreview = content.substring(0, 100);
        await this.conversationRepository.save(conversation);

        // Send real-time message via WebSocket
      //  this.logger.log(`📢 Sending real-time message to user ${recipientId}`);
        this.messagesGateway.sendNewMessage(
            recipientId.toString(),
            {
                id: savedMessage.id,
                conversationId,
                senderId: sender.id,
                senderName: `${sender.firstName} ${sender.lastName}`,
                content,
                createdAt: savedMessage.createdAt,
                status: isRecipientOnline ? 'delivered' : 'sent',
            }
        );

        return savedMessage;
    }

    /**
     * Mark messages as read
     */
    async markAsRead(userId: number, conversationId: number): Promise<void> {
      //  this.logger.log(`👁️ Marking messages as read in conversation ${conversationId} for user ${userId}`);
        
        const result = await this.messageRepository.update(
            {
                conversation: { id: conversationId },
                senderId: Not(userId),
                status: Not(MessageStatus.READ),
            },
            { status: MessageStatus.READ, readAt: new Date() }
        );

       // this.logger.log(`👁️ Marked ${result.affected} messages as read`);

        if (result.affected && result.affected > 0) {
            // Notify sender that messages were read
           // this.logger.log(`📢 Sending read receipt for conversation ${conversationId}`);
            this.messagesGateway.sendReadReceipt(conversationId, userId);
        }
    }

    /**
     * Archive conversation
     */
    async archiveConversation(userId: number, conversationId: number): Promise<void> {
        //this.logger.log(`📦 Archiving conversation ${conversationId} for user ${userId}`);
        
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
        //this.logger.log(`✅ Conversation ${conversationId} archived`);
    }

    /**
     * Delete conversation (soft delete)
     */
    async deleteConversation(userId: number, conversationId: number): Promise<void> {
        //this.logger.log(`🗑️ Deleting conversation ${conversationId} for user ${userId}`);
        
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
         //   this.logger.log(`✅ Conversation ${conversationId} permanently deleted`);
        } else {
            await this.conversationRepository.save(conversation);
//this.logger.log(`✅ Conversation ${conversationId} soft deleted for user ${userId}`);
        }
    }

    /**
     * Get unread count for user
     */
    async getUnreadCount(userId: number): Promise<number> {
        //this.logger.log(`🔢 Getting unread count for user ${userId}`);
        
        const conversations = await this.conversationRepository.find({
            where: [
                { participant1Id: userId, participant1Deleted: false },
                { participant2Id: userId, participant2Deleted: false },
            ],
        });

        const conversationIds = conversations.map(c => c.id);

        if (conversationIds.length === 0) {
          //  this.logger.log(`🔢 No conversations found for user ${userId}`);
            return 0;
        }

        const count = await this.messageRepository.count({
            where: {
                conversation: { id: In(conversationIds) },
                senderId: Not(userId),
                status: Not(MessageStatus.READ),
            },
        });

     //   this.logger.log(`🔢 User ${userId} has ${count} unread messages`);
        return count;
    }

    /**
     * Save message (called from gateway)
     */
    async saveMessage(data: {
        conversationId: number;
        senderId: number;
        content: string;
        status: MessageStatus;
    }): Promise<Message> {
        //this.logger.log(`💾 Saving message from gateway: conversation ${data.conversationId}, sender ${data.senderId}`);
        
        const conversation = await this.conversationRepository.findOne({
            where: { id: data.conversationId }
        });

        if (!conversation) {
            this.logger.error(`❌ Conversation ${data.conversationId} not found`);
            throw new NotFoundException('Conversation not found');
        }

        const sender = await this.userRepository.findOne({
            where: { id: data.senderId }
        });

        if (!sender) {
            this.logger.error(`❌ Sender ${data.senderId} not found`);
            throw new NotFoundException('Sender not found');
        }

        const message = this.messageRepository.create({
            conversation,
            sender,
            content: data.content,
            status: data.status,
        });

        const savedMessage = await this.messageRepository.save(message);
        //this.logger.log(`✅ Message saved with ID: ${savedMessage.id}`);

        // Update conversation last message
        conversation.lastMessageAt = new Date();
        conversation.lastMessagePreview = data.content.substring(0, 100);
        await this.conversationRepository.save(conversation);

        return savedMessage;
    }

    /**
     * Mark messages as read by IDs
     */
    async markMessagesAsRead(messageIds: number[], readerId: number): Promise<void> {
        if (messageIds.length === 0) return;
        
       // this.logger.log(`👁️ Marking ${messageIds.length} messages as read by user ${readerId}`);

        await this.messageRepository.update(
            { id: In(messageIds) },
            { status: MessageStatus.READ, readAt: new Date() }
        );
    }

    /**
     * Get conversation by ID
     */
    async getConversation(conversationId: number): Promise<Conversation> {
        //this.logger.log(`🔍 Getting conversation ${conversationId}`);
        
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId },
            relations: ['participant1', 'participant2'],
        });

        if (!conversation) {
            this.logger.error(`Conversation ${conversationId} not found`);
            throw new NotFoundException('Conversation not found');
        }

        return conversation;
    }
}