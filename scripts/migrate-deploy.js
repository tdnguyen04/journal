// Migration script that uses MIGRATE_DATABASE_URL if available, otherwise DATABASE_URL
const { execSync } = require('child_process');

const migrateUrl = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;

if (!migrateUrl) {
  console.error('❌ DATABASE_URL or MIGRATE_DATABASE_URL must be set');
  process.exit(1);
}

// Log which URL we're using (without exposing password)
const urlInfo = migrateUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/);
if (urlInfo) {
  const [, user, , host, db] = urlInfo;
  console.log(`🔗 Using database: ${user}@${host}/${db}`);
  
  // Check if using pooler (should warn)
  if (host.includes('pooler')) {
    console.warn('⚠️  WARNING: Using pooler connection for migrations may hang. Set MIGRATE_DATABASE_URL to direct connection (port 5432).');
  }
}

console.log('🚀 Running Prisma migrations...');
try {
  // Override DATABASE_URL in env, and bypass prisma.config.ts by specifying schema directly
  execSync(`prisma migrate deploy --schema=prisma/schema.prisma`, { 
    stdio: 'inherit', 
    env: { 
      ...process.env, 
      DATABASE_URL: migrateUrl,
      // Don't use prisma.config.ts for migrations
      PRISMA_CONFIG_PATH: undefined,
    },
    // Set a timeout (5 minutes max - shorter for faster feedback)
    timeout: 300000,
  });
  console.log('✅ Migrations applied successfully');
} catch (error) {
  if (error.signal === 'SIGTERM') {
    console.error('❌ Migration timed out after 5 minutes');
    console.error('💡 Tip: Make sure MIGRATE_DATABASE_URL uses direct connection (port 5432), not pooler (port 6543)');
  } else {
    console.error('❌ Migration failed:', error.message);
  }
  process.exit(1);
}
