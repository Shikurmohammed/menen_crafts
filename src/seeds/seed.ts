import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnection } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seed() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const connection = getConnection();

    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing data
        await connection.query('TRUNCATE TABLE users, categories, crafts, reviews, orders, order_items RESTART IDENTITY CASCADE');

        // Seed users
        const hashedPassword = await bcrypt.hash('password123', 10);
        const users = await connection.query(`
      INSERT INTO users (email, password, "firstName", "lastName", role, avatar, "isVerified")
      VALUES 
        ('admin@crafts.com', '${hashedPassword}', 'Admin', 'User', 'admin', 'https://randomuser.me/api/portraits/men/1.jpg', true),
        ('artisan1@crafts.com', '${hashedPassword}', 'John', 'Artisan', 'user', 'https://randomuser.me/api/portraits/men/2.jpg', true),
        ('artisan2@crafts.com', '${hashedPassword}', 'Sarah', 'Maker', 'user', 'https://randomuser.me/api/portraits/women/1.jpg', true),
        ('customer1@crafts.com', '${hashedPassword}', 'Mike', 'Customer', 'user', 'https://randomuser.me/api/portraits/men/3.jpg', true)
      RETURNING *
    `);

        // Seed categories
        const categories = await connection.query(`
      INSERT INTO categories (name, description, image, slug)
      VALUES 
        ('Woodwork', 'Handcrafted wooden items', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400', 'woodwork'),
        ('Pottery', 'Beautiful ceramic and pottery items', 'https://images.unsplash.com/photo-1574732011388-8e9d1ef55d93?w-400', 'pottery'),
        ('Textiles', 'Woven and textile crafts', 'https://images.unsplash.com/photo-1590344668577-1b3d3b3b3b3b?w=400', 'textiles'),
        ('Jewelry', 'Handmade jewelry and accessories', 'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=400', 'jewelry'),
        ('Home Decor', 'Decorative items for your home', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400', 'home-decor')
      RETURNING *
    `);

        // Seed crafts
        const crafts = await connection.query(`
      INSERT INTO crafts (title, description, price, images, stock, "isAvailable", "artisanId", specifications)
      VALUES 
        ('Handmade Wooden Bowl', 'Beautiful handmade wooden bowl crafted from oak wood. Perfect for serving fruit or as a decorative piece.', 49.99, ARRAY['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800'], 10, true, '${users[1].id}', '{"material": "Oak Wood", "dimensions": "12x12x6 inches", "finish": "Natural Oil"}'),
        ('Ceramic Mug Set', 'Set of 4 hand-thrown ceramic mugs with unique glazes. Each piece is unique and food-safe.', 75.00, ARRAY['https://images.unsplash.com/photo-1574732011388-8e9d1ef55d93?w=800'], 15, true, '${users[2].id}', '{"material": "Stoneware Clay", "capacity": "12oz each", "microwaveSafe": true, "dishwasherSafe": true}'),
        ('Woven Wool Blanket', 'Cozy wool blanket hand-woven using traditional techniques. Perfect for chilly evenings.', 120.00, ARRAY['https://images.unsplash.com/photo-1590344668577-1b3d3b3b3b3b?w=800'], 5, true, '${users[1].id}', '{"material": "100% Wool", "dimensions": "60x80 inches", "care": "Dry clean only"}'),
        ('Silver Pendant Necklace', 'Handcrafted silver pendant with semi-precious stone. Comes with 18-inch sterling silver chain.', 89.99, ARRAY['https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800'], 8, true, '${users[2].id}', '{"material": "Sterling Silver", "stone": "Amethyst", "chainLength": "18 inches", "claspType": "Lobster"}')
      RETURNING *
    `);

        // Link crafts to categories
        await connection.query(`
      INSERT INTO crafts_categories_categories ("craftsId", "categoriesId")
      VALUES 
        ('${crafts[0].id}', '${categories[0].id}'),
        ('${crafts[0].id}', '${categories[4].id}'),
        ('${crafts[1].id}', '${categories[1].id}'),
        ('${crafts[2].id}', '${categories[2].id}'),
        ('${crafts[2].id}', '${categories[4].id}'),
        ('${crafts[3].id}', '${categories[3].id}')
    `);

        // Seed reviews
        await connection.query(`
      INSERT INTO reviews (rating, comment, "userId", "craftId", "isVerifiedPurchase")
      VALUES 
        (5, 'Absolutely beautiful craftsmanship! The bowl is even better in person.', '${users[3].id}', '${crafts[0].id}', true),
        (4, 'Love my new mugs! Each one has its own character. Shipping was fast.', '${users[3].id}', '${crafts[1].id}', true),
        (5, 'This blanket is incredibly warm and well-made. Worth every penny!', '${users[0].id}', '${crafts[2].id}', true),
        (5, 'Stunning necklace! The attention to detail is amazing.', '${users[1].id}', '${crafts[3].id}', true)
    `);

        console.log('✅ Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await app.close();
        process.exit(0);
    }
}

seed();