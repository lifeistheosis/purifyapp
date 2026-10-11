import { StartHere } from "@/components/start/StartHere";

export const metadata = {
  title: "Start here",
  description:
    "New to Orthodoxy? Seven small steps, in order: a first prayer, the Sign of the Cross, a simple morning rule, a Gospel, the faith a little each day, the Church's day, and a parish.",
};

// Start here (1.6): a first step for the reader who is new, and the six
// after it (lib/start/steps.ts). Links to screens the app already has and
// nothing more. It reads no cookie and no session, so it prerenders as it
// stands for the website and for the apps' static export.
export default function StartPage() {
  return <StartHere />;
}
