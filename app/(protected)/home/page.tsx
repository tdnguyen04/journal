import { Suspense } from 'react';
import LogCard from './components/log-card';
import LogFeed from './components/log-feed';
import { CreateLogForm } from './components/create-log-form';

export default function HomePage() {
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Journal</h1>
      
      {/* The Write Layer */}
      <CreateLogForm />

      {/* The Read Layer */}
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading logs...</div>}>
        <LogFeed />
      </Suspense>
    </div>
  );
}
