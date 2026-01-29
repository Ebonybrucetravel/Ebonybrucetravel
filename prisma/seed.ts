import { PrismaClient, UserRole, ProductType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // 1. Create Super Admin User
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@ebonybruce.com';
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
    console.log(`   Password: ${superAdminPassword} (Please change this!)`);
  }

  // 2. Create Admin User (Optional)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ebonybruce.com';
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
      console.log(`   Password: ${adminPassword} (Please change this!)`);
    } else {
      console.log(`⚠️  Admin already exists: ${adminEmail}`);
    }
  }

  // 3. Create Default Markup Configurations
  console.log('\n📊 Creating default markup configurations...\n');

  const defaultMarkups = [
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
      productType: ProductType.HOTEL,
      markupPercentage: 15.0,
      serviceFeeAmount: 5000.0,
      currency: 'NGN',
      description: 'Default markup for hotel bookings',
    },
    {
      productType: ProductType.CAR_RENTAL,
      markupPercentage: 10.0,
      serviceFeeAmount: 3000.0,
      currency: 'NGN',
      description: 'Default markup for car rental bookings',
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
      console.log(
        `✅ Created markup for ${markup.productType} (${markup.currency}): ${markup.markupPercentage}% + ₦${markup.serviceFeeAmount}`,
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
  console.log(`   - Super Admin password: ${superAdminPassword}`);
  console.log('   - Please change default passwords after first login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


