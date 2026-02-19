import 'dotenv/config';
import { PrismaClient, UserRole, ProductType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required to run the seed.');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1. Create Super Admin User (default: dedicated admin email so it doesn't clash with customer accounts)
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'justtargetseyi@gmail.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123!';
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingSuperAdmin) {
    console.log(`⚠️  Super Admin already exists: ${superAdminEmail}`);
    
    // Update to ensure role is SUPER_ADMIN
    if (existingSuperAdmin.role !== UserRole.SUPER_ADMIN) {
      await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { role: UserRole.SUPER_ADMIN },
      });
      console.log(`✅ Updated user to SUPER_ADMIN role`);
    }
  } else {
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: 'Super Administrator',
        password: hashedPassword,
        role: UserRole.SUPER_ADMIN,
      },
    });
    console.log(`✅ Created Super Admin: ${superAdmin.email}`);
    console.log(`   ID: ${superAdmin.id}`);
    console.log('   Password: set via env (change after first login)');
  }

  // 1b. Ensure former admin emails used as customers are CUSTOMER role (no clash with dedicated admin)
  const customerEmails = ['obadeyi01@gmail.com', 'obadeyi04@gmail.com'];
  for (const email of customerEmails) {
    if (email === superAdminEmail) continue;
    const u = await prisma.user.findUnique({ where: { email } });
    if (u && u.role !== UserRole.CUSTOMER) {
      await prisma.user.update({
        where: { email },
        data: { role: UserRole.CUSTOMER },
      });
      console.log(`✅ Set ${email} to CUSTOMER (was ${u.role})`);
    }
  }

  // 2. Create Admin User (Optional)
  const adminEmail = process.env.ADMIN_EMAIL || 'justtargetseyi@gmail.com';
  if (adminEmail !== superAdminEmail) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!';
    const adminHashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Administrator',
          password: adminHashedPassword,
          role: UserRole.ADMIN,
        },
      });
      console.log(`✅ Created Admin: ${admin.email}`);
      console.log(`   ID: ${admin.id}`);
      console.log('   Password: set via env (change after first login)');
    } else {
      console.log(`⚠️  Admin already exists: ${adminEmail}`);
    }
  }

  // 3. Create Default Markup Configurations
  console.log('\n📊 Creating default markup configurations...\n');

  const defaultMarkups = [
    // ==================== FLIGHT MARKUPS ====================
    {
      productType: ProductType.FLIGHT_DOMESTIC,
      markupPercentage: 10.0,
      serviceFeeAmount: 5000.0,
      currency: 'NGN',
      description: 'Default markup for domestic Nigerian flights (Trips Africa)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 10000.0,
      currency: 'NGN',
      description: 'Default markup for international flights (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 50.0,
      currency: 'USD',
      description: 'Default markup for international flights in USD (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 40.0,
      currency: 'GBP',
      description: 'Default markup for international flights in GBP (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 45.0,
      currency: 'EUR',
      description: 'Default markup for international flights in EUR (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 5000.0,
      currency: 'JPY',
      description: 'Default markup for international flights in JPY (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 300.0,
      currency: 'CNY',
      description: 'Default markup for international flights in CNY (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 200.0,
      currency: 'GHS',
      description: 'Default markup for international flights in GHS (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 1000.0,
      currency: 'KES',
      description: 'Default markup for international flights in KES (Duffel)',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 500.0,
      currency: 'ZAR',
      description: 'Default markup for international flights in ZAR (Duffel)',
    },
    // ==================== HOTEL MARKUPS ====================
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 5000.0,
      currency: 'NGN',
      description: 'Default markup for hotel bookings in NGN (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 25.0,
      currency: 'GBP',
      description: 'Default markup for hotel bookings in GBP (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 30.0,
      currency: 'USD',
      description: 'Default markup for hotel bookings in USD (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 28.0,
      currency: 'EUR',
      description: 'Default markup for hotel bookings in EUR (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 3000.0,
      currency: 'JPY',
      description: 'Default markup for hotel bookings in JPY (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 200.0,
      currency: 'CNY',
      description: 'Default markup for hotel bookings in CNY (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 150.0,
      currency: 'GHS',
      description: 'Default markup for hotel bookings in GHS (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 800.0,
      currency: 'KES',
      description: 'Default markup for hotel bookings in KES (Amadeus/Duffel)',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 400.0,
      currency: 'ZAR',
      description: 'Default markup for hotel bookings in ZAR (Amadeus/Duffel)',
    },
    // ==================== CAR RENTAL MARKUPS ====================
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 3000.0,
      currency: 'NGN',
      description: 'Default markup for car rental bookings (NGN)',
    },
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 15.0,
      currency: 'GBP',
      description: 'Default markup for car rental bookings in GBP (Amadeus)',
    },
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 20.0,
      currency: 'USD',
      description: 'Default markup for car rental bookings in USD (Amadeus)',
    },
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 18.0,
      currency: 'EUR',
      description: 'Default markup for car rental bookings in EUR (Amadeus)',
    },
  ];

  for (const markup of defaultMarkups) {
    // Check if active markup exists for this product type and currency
    const existing = await prisma.markupConfig.findFirst({
      where: {
        productType: markup.productType,
        currency: markup.currency,
        isActive: true,
      },
    });

    if (!existing) {
      const created = await prisma.markupConfig.create({
        data: markup,
      });
      const currencySymbol = markup.currency === 'NGN' ? '₦' : 
                            markup.currency === 'GBP' ? '£' :
                            markup.currency === 'USD' ? '$' :
                            markup.currency === 'EUR' ? '€' :
                            markup.currency === 'JPY' ? '¥' :
                            markup.currency === 'CNY' ? '¥' :
                            markup.currency === 'GHS' ? '₵' :
                            markup.currency === 'KES' ? 'KSh' :
                            markup.currency === 'ZAR' ? 'R' : markup.currency;
      
      console.log(
        `✅ Created markup for ${markup.productType} (${markup.currency}): ${markup.markupPercentage}% + ${currencySymbol}${markup.serviceFeeAmount}`,
      );
    } else {
      console.log(
        `⚠️  Active markup already exists for ${markup.productType} (${markup.currency})`,
      );
    }
  }

  console.log('\n✅ Database seed completed successfully!\n');
  console.log('📝 Important:');
  console.log(`   - Super Admin login: ${superAdminEmail}`);
  console.log('   - Super Admin password: (set via SUPER_ADMIN_PASSWORD env – never logged)');
  console.log('   - Change default passwords after first login if you used defaults.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


