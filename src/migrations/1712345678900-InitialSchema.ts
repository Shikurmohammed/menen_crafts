import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1712345678900 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create users table
        await queryRunner.query(`
      CREATE TABLE users (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(100) NOT NULL,
        "lastName" VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        avatar VARCHAR(500),
        "isVerified" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create categories table
        await queryRunner.query(`
      CREATE TABLE categories (
       id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        image VARCHAR(500),
        slug VARCHAR(100) UNIQUE,
        "isActive" BOOLEAN DEFAULT true
      )
    `);

        // Create crafts table
        await queryRunner.query(`
      CREATE TABLE crafts (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        images TEXT[] NOT NULL,
        stock INTEGER DEFAULT 0,
        "isAvailable" BOOLEAN DEFAULT true,
        views INTEGER DEFAULT 0,
        specifications JSONB,
        "artisanId" UUID REFERENCES users(id) ON DELETE CASCADE,
        "averageRating" DECIMAL(3,2) DEFAULT 0.00,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create crafts_categories join table
        await queryRunner.query(`
      CREATE TABLE crafts_categories_categories (
        "craftsId" UUID REFERENCES crafts(id) ON DELETE CASCADE,
        "categoriesId" UUID REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY ("craftsId", "categoriesId")
      )
    `);

        // Create reviews table
        await queryRunner.query(`
      CREATE TABLE reviews (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        "isVerifiedPurchase" BOOLEAN DEFAULT false,
        "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
        "craftId" UUID REFERENCES crafts(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create orders table
        await queryRunner.query(`
      CREATE TABLE orders (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "orderNumber" VARCHAR(50) UNIQUE NOT NULL,
        "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
        "totalAmount" DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        "shippingAddress" TEXT,
        "billingAddress" TEXT,
        "trackingNumber" VARCHAR(100),
        notes TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "completedAt" TIMESTAMP
      )
    `);

        // Create order_items table
        await queryRunner.query(`
      CREATE TABLE order_items (
        id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "orderId" UUID REFERENCES orders(id) ON DELETE CASCADE,
        "craftId" UUID REFERENCES crafts(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL DEFAULT 1,
        "unitPrice" DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create indexes
        await queryRunner.query(`
      CREATE INDEX idx_crafts_artisan ON crafts("artisanId");
      CREATE INDEX idx_crafts_available ON crafts("isAvailable");
      CREATE INDEX idx_crafts_price ON crafts(price);
      CREATE INDEX idx_crafts_rating ON crafts("averageRating");
      
      CREATE INDEX idx_reviews_craft ON reviews("craftId");
      CREATE INDEX idx_reviews_user ON reviews("userId");
      
      CREATE INDEX idx_orders_user ON orders("userId");
      CREATE INDEX idx_orders_status ON orders(status);
      CREATE INDEX idx_orders_created ON orders("createdAt");
      
      CREATE INDEX idx_order_items_order ON order_items("orderId");
      CREATE INDEX idx_order_items_craft ON order_items("craftId");
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order
        await queryRunner.query(`DROP TABLE IF EXISTS order_items`);
        await queryRunner.query(`DROP TABLE IF EXISTS orders`);
        await queryRunner.query(`DROP TABLE IF EXISTS reviews`);
        await queryRunner.query(`DROP TABLE IF EXISTS crafts_categories_categories`);
        await queryRunner.query(`DROP TABLE IF EXISTS crafts`);
        await queryRunner.query(`DROP TABLE IF EXISTS categories`);
        await queryRunner.query(`DROP TABLE IF EXISTS users`);
    }
}