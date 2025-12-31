import LogCard from "./components/log-card";

export default function HomePage() {
  return <LogCard log={{createdAt: new Date(), content: { action: "Ask Rory out", status: "Success" }, id: 'ddew-22da-we232-ddsadw'}} />
}
