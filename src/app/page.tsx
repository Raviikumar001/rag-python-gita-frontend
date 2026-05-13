import ChatInterface from "./(core)/components/chat-interface";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <>
      <ChatInterface />
      <Toaster />
    </>
  );
}
