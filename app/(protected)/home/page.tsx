import { Suspense } from 'react';
import LogFeed from './components/log-feed';
import WeekNavigator from './components/week-navigator';
import { CreateLogDialog } from './components/create-log-dialog';
import { RealtimeLogListener } from './components/realtime-listener';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma/prisma';

type SearchParams = Promise<{ week?: string }>;

export default async function HomePage(props: {
  searchParams: SearchParams;
}) {
  const params = await props.searchParams;
  const weekParam = params.week; // undefined = current week
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch User Preferences to get the tags
  let availableTags = ["Health", "Learning", "Connection", "Deep Work", "Growth"];

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
      <CreateLogDialog />
      
      {/* Week Navigation */}
      <WeekNavigator currentWeek={weekParam} />

      {/* The Read Layer */}
      <Suspense 
        key={weekParam || 'current'} 
        fallback={<div className="text-sm text-muted-foreground py-8">Loading logs...</div>}
      >
        <LogFeed weekParam={weekParam} availableTags={availableTags} />
      </Suspense>
    </div>
  );
}
