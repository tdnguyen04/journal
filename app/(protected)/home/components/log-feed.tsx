import { getLogs } from "../data";
import LogCard from "./log-card";

export default async function LogFeed() {
  const logs = await getLogs();
  if (logs.length == 0) {
    return <div>No log found</div>
  }
  return (
    <div className="w-full flex flex-col gap-4">
      {logs.map((log) => (
        <LogCard key={log.id} log={log} />
      ))}
    </div>
  )
}