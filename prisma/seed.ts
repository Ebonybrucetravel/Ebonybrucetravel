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

  // 1. Create Super Admin User
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'ebonybruce10@gmail.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin@1000!';
  const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  });

  if (existingSuperAdmin) {
    console.log(`⚠️  Super Admin already exists: ${superAdminEmail}`);
    
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

  // 1b. Ensure former admin emails used as customers are CUSTOMER role
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
  const adminEmail = process.env.ADMIN_EMAIL || 'ebonybruce10@gmail.com';
  if (adminEmail !== superAdminEmail) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1000!';
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
    // Domestic Flights - 10% markup, 10% service fee
    {
      productType: ProductType.FLIGHT_DOMESTIC,
      markupPercentage: 10.0,
      serviceFeeAmount: 0, // Not used anymore, but kept for compatibility
      currency: 'NGN',
      description: 'Domestic flights - 10% markup + 10% service fee',
    },
    // International Flights - 15% markup, 15% service fee
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'NGN',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'USD',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'GBP',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'EUR',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'JPY',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'CNY',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'GHS',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'KES',
      description: 'International flights - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.FLIGHT_INTERNATIONAL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'ZAR',
      description: 'International flights - 15% markup + 15% service fee',
    },
    // ==================== HOTEL MARKUPS ====================
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'NGN',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'GBP',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'USD',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'EUR',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'JPY',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'CNY',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'GHS',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'KES',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    {
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 0,
      currency: 'ZAR',
      description: 'Hotels - 15% markup + 15% service fee',
    },
    // ==================== CAR RENTAL MARKUPS ====================
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 0,
      currency: 'NGN',
      description: 'Car rentals - 10% markup + 10% service fee',
    },
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 0,
      currency: 'GBP',
      description: 'Car rentals - 10% markup + 10% service fee',
    },
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 0,
      currency: 'USD',
      description: 'Car rentals - 10% markup + 10% service fee',
    },
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 0,
      currency: 'EUR',
      description: 'Car rentals - 10% markup + 10% service fee',
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
      
      const serviceFeeDisplay = markup.serviceFeeAmount === 0 ? 
        `${markup.markupPercentage}% (percentage)` : 
        `${currencySymbol}${markup.serviceFeeAmount}`;
      
      console.log(
        `✅ Created markup for ${markup.productType} (${markup.currency}): ${markup.markupPercentage}% markup + ${serviceFeeDisplay} service fee`,
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
  console.log('📊 Markup Summary:');
  console.log('   - FLIGHT_DOMESTIC (NGN): 10% markup + 10% service fee (Wakanow)');
  console.log('   - FLIGHT_INTERNATIONAL (NGN): 15% markup + 15% service fee (Wakanow)');
  console.log('   - FLIGHT_INTERNATIONAL (Other): 15% markup + fixed service fee (Duffel)');
  console.log('   - HOTEL: 15% markup + fixed service fee');
  console.log('   - CAR_RENTAL: 10% markup + fixed service fee\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });