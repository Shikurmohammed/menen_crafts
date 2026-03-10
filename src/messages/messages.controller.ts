import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) {}

    @Get('conversations')
    @ApiOperation({ summary: 'Get user conversations' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getConversations(
        @CurrentUser() user: User,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    ) {
        return this.messagesService.getUserConversations(user.id, page, limit);
    }

    @Get('conversations/:id')
    @ApiOperation({ summary: 'Get conversation messages' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getConversationMessages(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
        @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
        @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    ) {
        return this.messagesService.getConversationMessages(id, user.id, page, limit);
    }

    @Post('conversations')
    @ApiOperation({ summary: 'Start a new conversation' })
    async startConversation(
        @CurrentUser() user: User,
        @Body() createConversationDto: CreateConversationDto,
    ) {
        return this.messagesService.startConversation(user, createConversationDto);
    }

    @Post('messages')
    @ApiOperation({ summary: 'Send a message' })
    async sendMessage(
        @CurrentUser() user: User,
        @Body() sendMessageDto: SendMessageDto,
    ) {
        return this.messagesService.sendMessage(user, sendMessageDto);
    }

    @Post('conversations/:id/read')
    @ApiOperation({ summary: 'Mark conversation messages as read' })
    async markAsRead(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
    ) {
        await this.messagesService.markAsRead(user.id, id);
        return { message: 'Messages marked as read' };
    }

    @Delete('conversations/:id')
    @ApiOperation({ summary: 'Delete conversation' })
    async deleteConversation(
        @Param('id', ParseIntPipe) id: number,
        @CurrentUser() user: User,
    ) {
        await this.messagesService.deleteConversation(user.id, id);
        return { message: 'Conversation deleted successfully' };
    }

    @Get('unread')
    @ApiOperation({ summary: 'Get unread messages count' })
    async getUnreadCount(@CurrentUser() user: User) {
        const count = await this.messagesService.getUnreadCount(user.id);
        return { unreadCount: count };
    }
}