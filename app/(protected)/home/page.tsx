import { Suspense } from 'react';
import LogFeed from './components/log-feed';
import SearchBar from './components/search-bar';
import { CreateLogDialog } from './components/create-log-dialog';
import { RealtimeLogListener } from './components/realtime-listener';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma/prisma';

type SearchParams = Promise<{ q?: string }>;

export default async function HomePage(props: {
  searchParams: SearchParams; // 
}) {
  const params = await props.searchParams;
  const query = params.q || '';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Fetch User Preferences to get the tags
  // We use a safe check for user?.id in case of edge cases
  let availableTags = ["Health", "Learning", "Connection", "Deep Work", "Growth"]; // Default

  if (user?.id) {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId: user.id },
      select: { customValues: true }
    });

    if (prefs?.customValues && prefs.customValues.length > 0) {
      availableTags = prefs.customValues;
    }
  }
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto py-6 px-4">
      <RealtimeLogListener />
      <h1 className="text-2xl font-bold mb-6">Journal</h1>

      
      {/* The Write Layer */}
      {!query && <CreateLogDialog />}
      <SearchBar />

      {/* The Read Layer */}
      <Suspense key={query} fallback={<div className="text-sm text-muted-foreground">Loading logs...</div>}>
        <LogFeed query={query} availableTags={availableTags} />
      </Suspense>
    </div>
  );
}
