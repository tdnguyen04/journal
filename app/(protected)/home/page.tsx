import { Suspense } from 'react';
import LogCard from './components/log-card';
import LogFeed from './components/log-feed';

export default function HomePage() {
  return (
    <Suspense>
      <LogFeed />
    </Suspense>
  );
}
