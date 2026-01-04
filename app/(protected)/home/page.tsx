import { Suspense } from 'react';
import LogFeed from './components/log-feed';
import { CreateLogForm } from './components/create-log-form';
import SearchBar from './components/search-bar';

type SearchParams = Promise<{ q?: string }>;

export default async function HomePage(props: {
  searchParams: SearchParams; // 
}) {
  const params = await props.searchParams;
  const query = params.q || '';
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Journal</h1>

      
      {/* The Write Layer */}
      {!query && <CreateLogForm />}
      <SearchBar />

      {/* The Read Layer */}
      <Suspense key={query} fallback={<div className="text-sm text-muted-foreground">Loading logs...</div>}>
        <LogFeed query={query} />
      </Suspense>
    </div>
  );
}
