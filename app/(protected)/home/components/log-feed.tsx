import { getLogs } from '../data';
import { LogViewToggle } from './log-view-toggle';

interface LogFeedProps {
  weekParam?: string;
  availableTags: string[];
}

export default async function LogFeed({ weekParam, availableTags }: LogFeedProps) {
  const logs = await getLogs(weekParam);
  
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No entries this week</p>
        <p className="text-sm mt-1">Start logging via Telegram or use the button above</p>
      </div>
    );
  }

  return <LogViewToggle logs={logs} availableTags={availableTags} />;
}
