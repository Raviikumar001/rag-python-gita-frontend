import ChatInterface from "../(core)/components/chat-interface";

import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <main className="flex  flex-col items-center justify-between p-8">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-neutral-900">
          <div className="absolute inset-0 bg-fuchsia-400 bg-[size:20px_20px] opacity-20 blur-[100px]"></div>
        </div>
      </div>
      <ChatInterface />
      <Toaster />
    </main>
  );
}
