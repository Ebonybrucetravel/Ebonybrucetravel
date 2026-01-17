const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...\n');
    await prisma.$connect();
    console.log('✅ SUCCESS: Database connected successfully!\n');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED: Connection error\n');
    console.error('Error:', error.message.split('\n')[0]);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Check if password is correct in Supabase');
    console.error('2. Verify database is not paused');
    console.error('3. Check your network connection\n');
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();


