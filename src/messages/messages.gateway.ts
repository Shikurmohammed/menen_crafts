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
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
    namespace: 'messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger = new Logger(MessagesGateway.name);
    private userSockets: Map<number, string[]> = new Map();

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token || 
                         client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });

            const userId = payload.sub;
            
            // Store socket connection
            const userSockets = this.userSockets.get(userId) || [];
            userSockets.push(client.id);
            this.userSockets.set(userId, userSockets);

            // Join user to their room
            client.join(`user-${userId}`);
            
            this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

            // Send online status to relevant conversations
            this.broadcastUserStatus(userId, true);
        } catch (error) {
            this.logger.error('Connection error:', error);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        // Remove socket from userSockets map
        for (const [userId, sockets] of this.userSockets.entries()) {
            const index = sockets.indexOf(client.id);
            if (index !== -1) {
                sockets.splice(index, 1);
                if (sockets.length === 0) {
                    this.userSockets.delete(userId);
                    // Broadcast offline status
                    this.broadcastUserStatus(userId, false);
                }
                break;
            }
        }
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number; content: string; recipientId: number },
    ) {
        try {
            const token = client.handshake.auth.token;
            const payload = this.jwtService.verify(token, {
                secret: this.configService.get('JWT_SECRET'),
            });
            
            const senderId = payload.sub;

            // Emit to recipient's room
            this.server.to(`user-${data.recipientId}`).emit('newMessage', {
                conversationId: data.conversationId,
                senderId,
                content: data.content,
                timestamp: new Date(),
            });

            return { success: true };
        } catch (error) {
            throw new WsException('Failed to send message');
        }
    }

    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number; recipientId: number; isTyping: boolean },
    ) {
        this.server.to(`user-${data.recipientId}`).emit('userTyping', {
            conversationId: data.conversationId,
            isTyping: data.isTyping,
        });
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number; senderId: number },
    ) {
        this.server.to(`user-${data.senderId}`).emit('messagesRead', {
            conversationId: data.conversationId,
            readAt: new Date(),
        });
    }

    // Public methods for service to use
    sendNewMessage(recipientId: string, message: any) {
        this.server.to(`user-${recipientId}`).emit('newMessage', message);
    }

    sendNewMessageNotification(recipientId: string, notification: any) {
        this.server.to(`user-${recipientId}`).emit('newMessageNotification', notification);
    }

    sendReadReceipt(conversationId: number, readerId: number) {
        this.server.to(`user-${readerId}`).emit('messagesRead', {
            conversationId,
            readAt: new Date(),
        });
    }

    private broadcastUserStatus(userId: number, isOnline: boolean) {
        // This would need to know which users share conversations
        // For simplicity, we'll emit to all - you can optimize this
        this.server.emit('userStatus', { userId, isOnline });
    }

    isUserOnline(userId: number): boolean {
        return this.userSockets.has(userId);
    }
}