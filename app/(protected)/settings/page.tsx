import { PreferencesForm } from './components/preferences-form';

export default async function SettingsPage() {
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <PreferencesForm />
    </div>
  );
}

