"use client";
import { createContext, useContext, useState, ReactNode } from "react";

interface ChatContextType {
  initialQuestion: string;
  setInitialQuestion: (question: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [initialQuestion, setInitialQuestion] = useState("");

  return (
    <ChatContext.Provider value={{ initialQuestion, setInitialQuestion }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
