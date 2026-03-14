import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/user.entity';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        private mailerService: MailerService,
        private configService: ConfigService,
    ) {}

    /**
     * Send welcome email to new users
     */
    async sendWelcomeEmail(to: string, name: string): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: 'Welcome to Menen Crafts!',
                template: './welcome',
                context: {
                    name,
                    loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
                    exploreUrl: `${this.configService.get('FRONTEND_URL')}/crafts`,
                },
            });
             console.log(`Welcome email sent to ${to}`);
        } catch (error) {
            console.log(`Failed to send welcome email to ${to}:`, error);
        }
    }

    /**
     * Send order confirmation email
     */
    async sendOrderConfirmation(to: string, order: any): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: `Order Confirmation #${order.orderNumber}`,
                template: './order-confirmation',
                context: {
                    customerName: order.user?.firstName,
                    orderNumber: order.orderNumber,
                    orderDate: new Date(order.createdAt).toLocaleDateString(),
                    items: order.items,
                    subtotal: order.totalAmount - (order.shippingCost || 0),
                    shippingCost: order.shippingCost || 0,
                    total: order.totalAmount,
                    trackingUrl: order.trackingNumber 
                        ? `${this.configService.get('FRONTEND_URL')}/orders/${order.id}/track`
                        : null,
                    orderUrl: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
                },
            });
             console.log(`Order confirmation email sent to ${to} for order #${order.orderNumber}`);
        } catch (error) {
            console.log(`Failed to send order confirmation to ${to}:`, error);
        }
    }

    /**
     * Send password reset email
     */
 async sendPasswordResetEmail(user: User, resetToken: string): Promise<void> {
    try {
          const resetUrl = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/forgot-password?token=${resetToken}`;
        await this.mailerService.sendMail({
            to: user.email,
            subject: 'Reset Your Password - Menen Crafts',
            template: './password-reset',
            context: {
                name: user.firstName, 
                resetUrl,
                expiryTime: '1 hour',
            },
        });
        console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
        console.log(`Failed to send password reset email to ${user.email}:`, error);
    }
}

    /**
     * Send order status update email
     */
    async sendOrderStatusUpdate(to: string, order: any): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: `Order #${order.orderNumber} Status Updated`,
                template: './order-status-update',
                context: {
                    customerName: order.user?.firstName,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    trackingNumber: order.trackingNumber,
                    estimatedDelivery: order.estimatedDelivery,
                    orderUrl: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
                },
            });
             console.log(`Status update email sent to ${to} for order #${order.orderNumber}`);
        } catch (error) {
            console.log(`Failed to send status update email to ${to}:`, error);
        }
    }

    /**
     * Send new message notification
     */
    async sendNewMessageNotification(to: string, message: any): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: `New Message from ${message.senderName}`,
                template: './new-message',
                context: {
                    recipientName: message.recipientName,
                    senderName: message.senderName,
                    messagePreview: message.content.substring(0, 100) + '...',
                    messageUrl: `${this.configService.get('FRONTEND_URL')}/messages/${message.conversationId}`,
                },
            });
             console.log(`Message notification email sent to ${to}`);
        } catch (error) {
            console.log(`Failed to send message notification to ${to}:`, error);
        }
    }

    /**
     * Send review notification to artisan
     */
    async sendReviewNotification(to: string, review: any): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: `New Review on Your Craft - ${review.craft.title}`,
                template: './new-review',
                context: {
                    artisanName: review.craft.artisan.firstName,
                    craftTitle: review.craft.title,
                    rating: review.rating,
                    comment: review.comment,
                    reviewerName: `${review.user.firstName} ${review.user.lastName}`,
                    reviewUrl: `${this.configService.get('FRONTEND_URL')}/crafts/${review.craft.id}`,
                },
            });
             console.log(`Review notification email sent to artisan ${to}`);
        } catch (error) {
            console.log(`Failed to send review notification to ${to}:`, error);
        }
    }

    /**
     * Send artisan welcome email
     */
    async sendArtisanWelcomeEmail(to: string, name: string): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject: 'Welcome to Menen Crafts Artisan Community!',
                template: './artisan-welcome',
                context: {
                    name,
                    dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/artisan`,
                    guideUrl: `${this.configService.get('FRONTEND_URL')}/artisan-guide`,
                },
            });
            console.log(`Artisan welcome email sent to ${to}`);
        } catch (error) {
            console.log(`Failed to send artisan welcome email to ${to}:`, error);
        }
    }

    /**
     * Send custom email (for admin use)
     */
    async sendCustomEmail(to: string, subject: string, template: string, context: any): Promise<void> {
        try {
            await this.mailerService.sendMail({
                to,
                subject,
                template,
                context,
            });
             console.log(`Custom email sent to ${to}`);
        } catch (error) {
            console.log(`Failed to send custom email to ${to}:`, error);
        }
    }
}