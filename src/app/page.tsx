"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowUp, Sparkles, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useChatContext } from "./contexts/chat-context";
import { useRouter } from "next/navigation";

import PromptInfoPopup from "./(core)/components/PromptInfoPopup";

const suggestions = [
  "5 lessions I can implement in my life from gita",
  "What was the main lession arjun learnt in gita",
  "Who was Arjun",
];

export default function Chatbot() {
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "user" | "bot"; content: string }>
  >([]);
  const [isChat, setIsChat] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { setInitialQuestion } = useChatContext();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
      textareaRef.current.style.overflowY =
        scrollHeight > 200 ? "scroll" : "hidden";
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim()) {
      setInitialQuestion(message.trim());
      router.push("/chat");
    }
  };

  const handleNewChat = () => {
    setIsChat(false);
    setChatMessages([]);
  };

  return (
    <div className="min-h-screen p-6  relative">
      <PromptInfoPopup />
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-neutral-900">
          <div className="absolute inset-0 bg-fuchsia-400 bg-[size:20px_20px] opacity-20 blur-[100px]"></div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto pt-12 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-center gap-3 mb-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                <h1 className="text-4xl font-serif text-white">
                  Gita Ai Chatbot
                </h1>
              </div>
              <p className="text-gray-200 text-lg mt-2">
                How can I assist you today?
              </p>
            </motion.div>

            <div className="space-y-4">
              <Card className="border border-purple-300 shadow-[0_0_32px_-8px_rgba(213,197,255,0.5)] bg-white/90 backdrop-blur-sm">
                <div className="p-2">
                  <div className="relative flex items-end gap-2">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="border-0 bg-transparent text-lg focus-visible:ring-0 text-gray-900 placeholder:text-gray-500 py-3 min-h-[48px] max-h-[200px] overflow-y-auto resize-none"
                      style={{
                        height: "auto",
                        maxHeight: "200px",
                        overflowY:
                          message.split("\n").length > 3 ? "scroll" : "hidden",
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="rounded-full w-8 h-8 bg-gradient-to-b from-purple-600 to-purple-700 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
                      disabled={!message.trim()}
                      onClick={handleSubmit}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              <div className="flex flex-wrap gap-2 justify-start">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      className="h-8 bg-white/80 hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-purple-300 rounded-lg text-sm px-3 transition-colors duration-200 shadow-[0_2px_8px_-2px_rgba(213,197,255,0.3)]"
                      onClick={() => setMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
