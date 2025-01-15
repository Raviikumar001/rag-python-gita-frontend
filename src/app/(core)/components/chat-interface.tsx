"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useChatContext } from "@/app/contexts/chat-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Copy, RefreshCw, Check, ChevronLeft, Send } from "lucide-react";
import { toast } from "./use-toast";
import { useAskQuestion } from "@/hooks/useAskQuestion";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Message {
  id: number;
  content: string;
  sender: "bot" | "user";
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [copying, setCopying] = useState<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { initialQuestion, setInitialQuestion } = useChatContext();
  const router = useRouter();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useAskQuestion(
    (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: prevMessages.length + 1,
          content: data.answer,
          sender: "bot",
        },
      ]);
    },
    (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  );

  useEffect(() => {
    if (initialQuestion) {
      console.log("initialQuestion", initialQuestion);
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  }, [initialQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const questionToSubmit = input.trim() || initialQuestion;
    if (!questionToSubmit.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        content: questionToSubmit,
        sender: "user",
      },
    ]);
    setInput("");

    mutation.mutate(questionToSubmit);

    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
    }
    setInput("");
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(id);
      toast({
        title: "Copied to clipboard",
        description: "The message has been copied to your clipboard.",
      });
      setTimeout(() => setCopying(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      toast({
        title: "Copy failed",
        description: "Failed to copy the message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const LoadingSpinner = () => (
    <motion.div
      className="flex items-center gap-2 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="relative w-6 h-6"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Image
          src="/gemini.png"
          alt="Loading..."
          width={24}
          height={24}
          className="object-contain"
        />
      </motion.div>
      <span className="text-sm text-muted-foreground">Thinking...</span>
    </motion.div>
  );

  return (
    <Card className="w-full max-w-6xl mx-auto h-[95vh] flex flex-col">
      {/* Back to Home Button */}
      <div className="flex items-center p-4">
        <Button
          variant="outline"
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          <Bot className="h-4 w-4" />
          Back to Home
        </Button>
      </div>

      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-colors"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.sender === "user" ? "flex-row-reverse" : ""
            }`}
          >
            <Avatar className="h-8 w-8">
              {message.sender === "bot" ? (
                <>
                  <AvatarFallback>B</AvatarFallback>
                  <AvatarImage src="/gemini.png" className="object-cover" />
                </>
              ) : (
                <>
                  <AvatarImage src="/gita1.jpeg" className="object-cover" />
                  <AvatarFallback>U</AvatarFallback>
                </>
              )}
            </Avatar>
            <div
              className={`flex flex-col gap-1 ${
                message.sender === "user"
                  ? "max-w-[80%] items-end"
                  : "max-w-[90%]"
              }`}
            >
              <div
                className={`rounded-lg p-3 ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                }`}
              >
                {message.sender === "user" ? (
                  <pre className="whitespace-pre-wrap break-words font-sans">
                    {message.content}
                  </pre>
                ) : (
                  <ReactMarkdown
                    components={{
                      code({
                        node,
                        inline,
                        className,
                        children,
                        ...props
                      }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        const content = String(children).replace(/\n$/, "");

                        // content starts with curl or common shell commands
                        const isCurlOrShell = content
                          .trim()
                          .match(/^(curl|wget|ssh|git|docker|npm|yarn|pnpm)/);

                        // If it's a command and not already in a code block
                        if (!inline && (match || isCurlOrShell)) {
                          return (
                            <div className="relative rounded-md overflow-hidden my-2">
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match ? match[1] : "bash"}
                                PreTag="div"
                                className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                                customStyle={{
                                  margin: 0,
                                  padding: "1rem",
                                  backgroundColor: "rgb(40, 44, 52)",
                                  borderRadius: "0.375rem",
                                }}
                              >
                                {content}
                              </SyntaxHighlighter>
                            </div>
                          );
                        }

                        //  regular code blocks
                        return !inline && match ? (
                          <div className="relative rounded-md overflow-hidden my-2">
                            <SyntaxHighlighter
                              {...props}
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                              customStyle={{
                                margin: 0,
                                padding: "1rem",
                                backgroundColor: "rgb(40, 44, 52)",
                                borderRadius: "0.375rem",
                              }}
                            >
                              {content}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code
                            {...props}
                            className="bg-muted px-1.5 py-0.5 rounded-md text-sm"
                          >
                            {children}
                          </code>
                        );
                      },
                      a({ href, children }) {
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
                          >
                            {children}
                          </a>
                        );
                      },
                      ul({ children }) {
                        return (
                          <ul className="list-disc pl-6 my-2">{children}</ul>
                        );
                      },
                      ol({ children }) {
                        return (
                          <ol className="list-decimal pl-6 my-2">{children}</ol>
                        );
                      },
                      li({ children }) {
                        return <li className="my-1">{children}</li>;
                      },
                      p({ children }) {
                        // Check if children contains a code block
                        const hasCodeBlock = React.Children.toArray(
                          children
                        ).some(
                          (child) =>
                            React.isValidElement(child) && child.type === "code"
                        );

                        if (hasCodeBlock) {
                          return <>{children}</>;
                        }

                        // Otherwise render as normal paragraph
                        return (
                          <p className="my-2 leading-relaxed">{children}</p>
                        );
                      },
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-muted">
                              {children}
                            </table>
                          </div>
                        );
                      },
                      th({ children }) {
                        return (
                          <th className="border border-muted bg-muted/50 p-2 text-left">
                            {children}
                          </th>
                        );
                      },
                      td({ children }) {
                        return (
                          <td className="border border-muted p-2">
                            {children}
                          </td>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(message.content, message.id)}
                >
                  {copying === message.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
        {mutation.isPending && <LoadingSpinner />}
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textAreaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 min-h-[40px] max-h-[160px] resize-none scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 transition-colors"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit">Send Message</Button>
        </form>
      </div>
    </Card>
  );
}
