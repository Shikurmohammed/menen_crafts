import { IsOptional, IsString } from "class-validator";
import { Craft } from "src/crafts/craft.entity";
import { UserRole } from "src/enums/UserRole.enum";
import { Order } from "src/orders/order.entity";
import { Review } from "src/reviews/review.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
    rating: number;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ nullable: true })
    @IsOptional()
    bio?: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.CUSTOMER,
    })
    role: UserRole;

    @Column({ nullable: true })
    @IsOptional()
    displayTitle?: string;

    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    displayTitleEn?: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ nullable: true })
    @IsOptional()
    avatarPublicId?: string; // For Cloudinary

    @Column({ default: false })
    isVerified: boolean;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    country: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    zipCode: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ type: 'json', nullable: true })
    socialLinks: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
        github?: string;
        website?: string;
    };

    // Notification Settings
    @Column({ type: 'json', nullable: true })
    notificationSettings: {
        emailNotifications: boolean;
        pushNotifications: boolean;
        orderUpdates: boolean;
        newMessages: boolean;
        promotions: boolean;
        newsletter: boolean;
        reviewResponses: boolean;
        priceAlerts: boolean;
        weeklyDigest: boolean;
        soundEnabled: boolean;
        desktopNotifications: boolean;
        notificationFrequency: 'instant' | 'daily' | 'weekly';
    };

    // Security Settings
    @Column({ type: 'json', nullable: true })
    securitySettings: {
        twoFactorAuth: boolean;
        loginAlerts: boolean;
        saveLoginHistory: boolean;
        sessionTimeout: number;
        requirePasswordOnPurchase: boolean;
        showOnlineStatus: boolean;
        publicProfile: boolean;
    };

    // Appearance Settings
    @Column({ type: 'json', nullable: true })
    appearanceSettings: {
        theme: 'light' | 'dark' | 'system';
        compactMode: boolean;
        fontSize: 'small' | 'medium' | 'large';
        animations: boolean;
        reducedMotion: boolean;
        highContrast: boolean;
        colorScheme: string;
    };

    // Preferences
    @Column({ type: 'json', nullable: true })
    preferences: {
        currency: string;
        timezone: string;
        dateFormat: string;
        measurementSystem: 'metric' | 'imperial';
        language: string;
    };

    @OneToMany(() => Craft, craft => craft.artisan)
    crafts: Craft[];

    @OneToMany(() => Order, order => order.user)
    orders: Order[];

    @OneToMany(() => Review, review => review.user)
    reviews: Review[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    currentHashedRefreshToken: string;

    // Login history (could be a separate entity in production)
    @Column({ type: 'json', nullable: true })
    loginHistory: Array<{
        id: number;
        device: string;
        location: string;
        ip: string;
        time: Date;
        successful: boolean;
    }>;

    //Password reset fields
    @Column({nullable:true})
    resetPasswordToken:string;
    
    @Column({nullable:true})
    resetPasswordExpires:Date;
}




