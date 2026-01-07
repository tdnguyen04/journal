import { getLogs } from '../data';
import LogCard from './log-card';
import LogList from './log-list';
import { LogViewToggle } from './log-view-toggle';
import { TimelineView } from './timeline-view';

interface LogFeedProps {
  query: string;
  availableTags: string[]; // <--- Receive the tags here
}

export default async function LogFeed({ query, availableTags }: LogFeedProps) {
  const logs = await getLogs(query);
  if (logs.length == 0) {
    return <div>No log found</div>;
  }
  // return <LogList logs={logs} availableTags={availableTags} />;
  // return <TimelineView logs={logs} />;
  return <LogViewToggle logs={logs} availableTags={availableTags} />;
}
