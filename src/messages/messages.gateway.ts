import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { MessageStatus } from './message.entity';

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
    namespace: 'messages',
    transports: ['websocket', 'polling'],
    cookie: true,
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger = new Logger(MessagesGateway.name);
    private userSockets: Map<number, Set<string>> = new Map(); // userId -> Set of socketIds
    private socketToUser: Map<string, number> = new Map(); // socketId -> userId

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        @Inject(forwardRef(() => MessagesService))
        private messagesService: MessagesService,
    ) {}

    async handleConnection(client: Socket) {
        try {
           // this.logger.log(`🔌 Client attempting to connect: ${client.id}`);
            
            // Log cookies for debugging
            //this.logger.log(`🍪 Cookies: ${JSON.stringify(client.handshake.headers.cookie)}`);
            
            // Extract token from cookie
            let token: string | null = null;
            
            if (client.handshake.headers.cookie) {
                const cookies = client.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});
                
               // this.logger.log(`🍪 Parsed cookies: ${JSON.stringify(cookies)}`);
                
                // Try common cookie names
                token = cookies['token'] || cookies['jwt'] || cookies['access_token'] || cookies['connect.sid'];
            }

            if (!token) {
                this.logger.warn('❌ No token cookie found');
                client.emit('error', { message: 'Authentication required' });
                client.disconnect();
                return;
            }

            //this.logger.log(`🔑 Token found: ${token.substring(0, 20)}...`);

            // Verify token
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });

            const userId = payload.sub;
            //this.logger.log(`✅ User ${userId} authenticated`);

            // Store socket connection
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(client.id);
            this.socketToUser.set(client.id, userId);

            // Join user to their personal room
            client.join(`user-${userId}`);
           // this.logger.log(`🚪 User ${userId} joined room: user-${userId}`);
            
            // Get user's conversations and join their rooms
            try {
                const conversations = await this.messagesService.getUserConversations(userId, 1, 100);
              //  this.logger.log(`📋 User has ${conversations.conversations.length} conversations`);
                
                conversations.conversations.forEach(conv => {
                    client.join(`conversation-${conv.id}`);
                 //   this.logger.log(`🚪 Joined conversation-${conv.id}`);
                });
            } catch (error) {
                this.logger.error(`Failed to load conversations:`, error);
            }

            // Broadcast online status
            this.broadcastUserStatus(userId, true);

            // Send confirmation to client
            client.emit('connected', { 
                userId, 
                message: 'Connected successfully',
                onlineUsers: Array.from(this.userSockets.keys())
            });

            // Send current online status
            const onlineUserIds = Array.from(this.userSockets.keys());
            client.emit('onlineStatus', onlineUserIds.map(id => ({
                userId: id,
                isOnline: true
            })));

        } catch (error) {
            this.logger.error('❌ Connection error:', error.message);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = this.socketToUser.get(client.id);
        
        if (userId) {
           // this.logger.log(`📴 User ${userId} disconnected (socket: ${client.id})`);
            
            const userSockets = this.userSockets.get(userId);
            if (userSockets) {
                userSockets.delete(client.id);
                
                if (userSockets.size === 0) {
                    this.userSockets.delete(userId);
                   // this.logger.log(`👤 User ${userId} is now offline`);
                    this.broadcastUserStatus(userId, false);
                }
            }
            
            this.socketToUser.delete(client.id);
        }
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { 
            tempId: string; 
            conversationId: number; 
            content: string; 
            recipientId: number 
        },
    ) {
        try {
            const senderId = this.socketToUser.get(client.id);
            
            if (!senderId) {
                throw new WsException('User not authenticated');
            }

           // this.logger.log(`📨 Message from ${senderId} to ${data.recipientId}`);

            const isRecipientOnline = this.userSockets.has(data.recipientId);
           // this.logger.log(`📱 Recipient online: ${isRecipientOnline}`);

            // Save message to database
            const savedMessage = await this.messagesService.saveMessage({
                conversationId: data.conversationId,
                senderId,
                content: data.content,
                status: isRecipientOnline ? MessageStatus.DELIVERED : MessageStatus.SENT,
            });

            // Get sender details
            const sender = await this.messagesService.getUserById(senderId);

            const message = {
                id: savedMessage.id,
                tempId: data.tempId,
                conversationId: data.conversationId,
                senderId,
                sender: {
                    id: senderId,
                    firstName: sender.firstName,
                    lastName: sender.lastName,
                    avatar: sender.avatar,
                },
                content: data.content,
                createdAt: savedMessage.createdAt,
                status: isRecipientOnline ? 'delivered' : 'sent',
            };

            // Broadcast to conversation room
            this.server.to(`conversation-${data.conversationId}`).emit('newMessage', message);
           // this.logger.log(`📢 Broadcast to conversation-${data.conversationId}`);

            // Also send to recipient's personal room
            if (isRecipientOnline) {
                this.server.to(`user-${data.recipientId}`).emit('newMessage', message);
               // this.logger.log(`📢 Sent to user-${data.recipientId}`);
            }

            // Confirm to sender
            client.emit('messageSent', { 
                tempId: data.tempId, 
                message,
                delivered: isRecipientOnline
            });

            return { success: true };

        } catch (error) {
            this.logger.error('❌ Error sending message:', error);
            client.emit('messageFailed', { 
                tempId: data.tempId, 
                error: error.message 
            });
            throw new WsException('Failed to send message');
        }
    }

    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { 
            conversationId: number; 
            recipientId: number; 
            isTyping: boolean 
        },
    ) {
        const senderId = this.socketToUser.get(client.id);
        if (!senderId) return;

       // this.logger.log(`✏️ Typing: user ${senderId} ${data.isTyping ? 'started' : 'stopped'} typing`);

        const typingEvent = {
            conversationId: data.conversationId,
            senderId,
            isTyping: data.isTyping,
        };

        // Broadcast to conversation room
        this.server.to(`conversation-${data.conversationId}`).emit('userTyping', typingEvent);

        // Also to recipient
        if (data.recipientId) {
            this.server.to(`user-${data.recipientId}`).emit('userTyping', typingEvent);
        }
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { 
            conversationId: number; 
            messageIds: number[];
            senderId: number;
        },
    ) {
        const readerId = this.socketToUser.get(client.id);
        if (!readerId) return;

        //this.logger.log(`👁️ Mark as read: user ${readerId} read ${data.messageIds?.length || 0} messages`);

        try {
            await this.messagesService.markMessagesAsRead(data.messageIds, readerId);

            const readReceipt = {
                conversationId: data.conversationId,
                messageIds: data.messageIds,
                readAt: new Date(),
                readerId,
            };

            this.server.to(`conversation-${data.conversationId}`).emit('messagesRead', readReceipt);

            if (data.senderId) {
                this.server.to(`user-${data.senderId}`).emit('messagesRead', readReceipt);
            }

        } catch (error) {
            this.logger.error('Error marking as read:', error);
        }
    }

    @SubscribeMessage('getOnlineStatus')
    async handleGetOnlineStatus(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { userIds: number[] },
    ) {
        const statuses = data.userIds.map(userId => ({
            userId,
            isOnline: this.userSockets.has(userId),
        }));
        
       // this.logger.log(`📊 Online status requested for: ${data.userIds.join(', ')}`);
        client.emit('onlineStatus', statuses);
    }

    // ============== PUBLIC METHODS FOR SERVICE TO USE ==============

    /**
     * Send a new message to a user
     */
    sendNewMessage(recipientId: string, message: any) {
       // this.logger.log(`📢 sendNewMessage: Sending to user-${recipientId}`);
        this.server.to(`user-${recipientId}`).emit('newMessage', message);
    }

    /**
     * Send a new message notification
     */
    sendNewMessageNotification(recipientId: string, notification: any) {
      //  this.logger.log(`📢 sendNewMessageNotification: Sending to user-${recipientId}`);
        this.server.to(`user-${recipientId}`).emit('newMessageNotification', notification);
    }

    /**
     * Send read receipt
     */
    sendReadReceipt(conversationId: number, readerId: number) {
        //this.logger.log(`📢 sendReadReceipt: Sending to conversation-${conversationId}`);
        this.server.to(`conversation-${conversationId}`).emit('messagesRead', {
            conversationId,
            readAt: new Date(),
            readerId,
        });
    }

    /**
     * Broadcast user online/offline status to all connected clients
     */
    private broadcastUserStatus(userId: number, isOnline: boolean) {
       // this.logger.log(`📢 Broadcasting user ${userId} status: ${isOnline ? 'online' : 'offline'}`);
        this.server.emit('userStatus', { userId, isOnline });
    }

    /**
     * Check if a user is online
     */
    isUserOnline(userId: number): boolean {
        const isOnline = this.userSockets.has(userId);
       // this.logger.log(`🔍 Checking if user ${userId} is online: ${isOnline}`);
        return isOnline;
    }

    /**
     * Get all online users
     */
    getOnlineUsers(): number[] {
        return Array.from(this.userSockets.keys());
    }
}