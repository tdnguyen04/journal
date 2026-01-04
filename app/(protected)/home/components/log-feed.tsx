import { getLogs } from '../data';
import LogCard from './log-card';
import LogList from './log-list';

export default async function LogFeed() {
  const logs = await getLogs();
  if (logs.length == 0) {
    return <div>No log found</div>;
  }
  return <LogList logs={logs} />;
}
