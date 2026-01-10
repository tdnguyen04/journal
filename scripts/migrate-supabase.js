// Manual migration script for Supabase production
// Usage: Set SUPABASE_DATABASE_URL in .env or .env.local, then: npm run migrate:supabase
require('dotenv').config(); // Load .env
require('dotenv').config({ path: '.env.local' }); // Load .env.local (overrides .env)
const { execSync } = require('child_process');

const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

// Debug: Show what we found
console.log('🔍 Environment check:');
console.log(`   SUPABASE_DATABASE_URL: ${process.env.SUPABASE_DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);

if (!supabaseUrl) {
  console.error('❌ SUPABASE_DATABASE_URL or DATABASE_URL must be set');
  console.error('💡 Add to .env or .env.local:');
  console.error('   SUPABASE_DATABASE_URL="postgresql://user:pass@host:5432/dbname"');
  console.error('   (Use direct connection, port 5432, not pooler)');
  process.exit(1);
}

// Log which URL we're using (without exposing password)
const urlInfo = supabaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^/]+)\/(.+)/);
if (urlInfo) {
  const [, user, , host, db] = urlInfo;
  console.log(`🔗 Migrating database: ${user}@${host}/${db}`);
  
  if (host.includes('pooler')) {
    console.warn('⚠️  WARNING: Pooler connections may hang. Use direct connection (port 5432).');
  }
}

console.log('🚀 Running migrations against Supabase...');
try {
  execSync('prisma migrate deploy --schema=prisma/schema.prisma', { 
    stdio: 'inherit', 
    env: { 
      ...process.env, 
      DATABASE_URL: supabaseUrl,
    },
    timeout: 60000, // 1 minute timeout
  });
  console.log('✅ Migrations applied successfully to Supabase!');
  console.log('💡 Now commit and push - Vercel will build without running migrations.');
} catch (error) {
  if (error.signal === 'SIGTERM') {
    console.error('❌ Migration timed out');
    console.error('💡 Check your SUPABASE_DATABASE_URL is correct and uses direct connection');
  } else {
    console.error('❌ Migration failed:', error.message);
  }
  process.exit(1);
}
