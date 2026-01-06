import { createClient } from '@/lib/supabase/server';
import { getConnectionStatus } from './actions';
import { PreferencesForm } from './components/preferences-form';
import { SettingsListener } from './components/settings-listener';
import { TelegramConnect } from './components/telegram-connect';
import prisma from '@/lib/prisma/prisma';
import { TagManager } from './components/tag-manager';

export default async function SettingsPage() {
  const status = await getConnectionStatus();
  const supabase = await createClient(); // ✅ Correct await
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div>Please log in</div>;

  // Fetch current preferences
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: user.id },
  });

  // Default fallback if empty
  const currentTags =
    prefs?.customValues && prefs.customValues.length > 0
      ? prefs.customValues
      : ['Health', 'Learning', 'Connection', 'Deep Work', 'Growth'];
  return (
    <div className='flex flex-col w-full max-w-2xl mx-auto py-6 px-4'>
      <h1 className='text-2xl font-bold mb-6'>Settings</h1>
      <SettingsListener />
      {/* 1. AI Instructions */}
      <section className='space-y-4'>
        <PreferencesForm />
      </section>

      {/* 2. Telegram Bot Connection */}
      <section className='space-y-4 pt-6 border-t'>
        <TelegramConnect initialStatus={status} />
      </section>

      {/* 3. Custom Tag Manager */}
      <section className='space-y-4 pt-6 border-t'>
        <div>
          <h2 className='text-lg font-semibold'>Custom Tags</h2>
          <p className='text-sm text-muted-foreground'>
            Manage the values and categories you track in your journal.
          </p>
        </div>
        <TagManager initialTags={currentTags} />
      </section>
    </div>
  );
}
