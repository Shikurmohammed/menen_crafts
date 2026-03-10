// test-cloudinary.js
const path = require('path');
const dotenv = require('dotenv');

// Load .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env:', result.error);
    process.exit(1);
}

console.log('✅ .env loaded successfully');
console.log('Current directory:', process.cwd());

const cloudinary = require('cloudinary').v2;

// Get credentials
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('\n=== Cloudinary Configuration ===');
console.log('Cloud Name:', cloudName || '❌ Missing');
console.log('API Key:', apiKey ? '✅ Set (length: ' + apiKey.length + ')' : '❌ Missing');
console.log('API Secret:', apiSecret ? '✅ Set (length: ' + apiSecret.length + ')' : '❌ Missing');

if (!cloudName || !apiKey || !apiSecret) {
    console.error('\n❌ Missing Cloudinary credentials!');
    process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

console.log('\n🔧 Testing Cloudinary Configuration...');

async function testCloudinary() {
    try {
        // Test 1: Try a simple upload without API call first
        console.log('\n📤 Testing image upload...');
        
        // Create a simple test image (1x1 pixel transparent PNG)
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const uploadResult = await cloudinary.uploader.upload(testImage, {
            folder: 'test-folder',
            public_id: 'test-image-' + Date.now(),
        }).catch(err => {
            console.error('Upload error details:', {
                message: err.message,
                name: err.name,
                http_code: err.http_code,
                stack: err.stack
            });
            throw err;
        });

        console.log('✅ Test upload successful!');
        console.log('📎 Image URL:', uploadResult.secure_url);
        console.log('🆔 Public ID:', uploadResult.public_id);

        // Test 2: API Ping (if upload worked)
        console.log('\n📡 Testing API connection...');
        const pingResult = await cloudinary.api.ping();
        console.log('✅ Cloudinary API connection successful:', pingResult);

        // Test 3: Delete the test image
        console.log('\n🗑️ Testing image deletion...');
        const deleteResult = await cloudinary.uploader.destroy(uploadResult.public_id);
        console.log('✅ Image deleted successfully:', deleteResult);

        console.log('\n🎉 All Cloudinary tests passed! Your configuration is working correctly.');

    } catch (error) {
        console.error('\n❌ Cloudinary test failed!');
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            http_code: error.http_code,
            stack: error.stack
        });
        
        // Check for specific error types
        if (error.message) {
            if (error.message.includes('Invalid signature')) {
                console.error('\n🔑 Signature error! This usually means:');
                console.error('1. Your API_SECRET might be incorrect');
                console.error('2. There might be special characters in your API_SECRET');
                console.error('3. Try regenerating your API_SECRET in Cloudinary dashboard');
            } else if (error.message.includes('API key')) {
                console.error('\n🔑 API Key error! Check your CLOUDINARY_API_KEY');
            } else if (error.message.includes('cloud name')) {
                console.error('\n☁️ Cloud name error! Check your CLOUDINARY_CLOUD_NAME');
            } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
                console.error('\n🌐 Network error! Check your internet connection');
            }
        }
        
        // Try alternative test with different approach
        console.log('\n🔄 Attempting alternative test with API ping only...');
        try {
            const pingResult = await cloudinary.api.ping();
            console.log('✅ API ping succeeded:', pingResult);
        } catch (pingError) {
            console.error('❌ API ping also failed:', pingError.message);
        }
    }
}

// Run the test
testCloudinary();