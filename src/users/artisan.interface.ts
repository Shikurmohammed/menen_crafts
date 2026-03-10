import { User } from "./user.entity";


export interface Artisan extends User {
    bio?: string;
    specialties?: string[];
    rating: number;
    craftsCount: number;
    followersCount?: number;
    isVerified: boolean;
}