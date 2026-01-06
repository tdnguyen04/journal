import { getConnectionStatus } from './actions';
import { PreferencesForm } from './components/preferences-form';
import { TelegramConnect } from './components/telegram-connect';

export default async function SettingsPage() {
  const status = await getConnectionStatus();
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {/* 1. AI Instructions */}
      <PreferencesForm />

      {/* 2. Telegram Bot Connection */}
      <TelegramConnect initialStatus={status} />
    </div>
  );
}