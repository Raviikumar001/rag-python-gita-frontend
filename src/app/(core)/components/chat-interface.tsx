"use client";

import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatContext } from "@/app/contexts/chat-context";
import { toast } from "@/hooks/use-toast";
import PromptInfoPopup from "./PromptInfoPopup";

type Sender = "user" | "assistant";

type ChatMessage = {
  id: string;
  sender: Sender;
  content: string;
  status?: "streaming" | "complete" | "error";
};

type ChatSession = {
  id: string;
  apiSessionId?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

type SpeakerFilter = "" | "Krishna" | "Arjuna" | "Sanjaya" | "Dhritirashtra";

type AskStreamEvent = {
  token?: string;
  done?: boolean;
  session_id?: string;
  query_time_ms?: number;
};

const STORAGE_KEY = "gita-ai-chat-sessions-v2";
const ACTIVE_STORAGE_KEY = "gita-ai-active-session-v2";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const API_KEY =
  process.env.NEXT_PUBLIC_API_KEY || "dev-key-change-in-production";

const suggestions = [
  "What is karma yoga?",
  "How does Krishna describe a steady mind?",
  "Explain dharma in simple words",
  "Find verses about action without attachment",
];

const speakers: SpeakerFilter[] = [
  "",
  "Krishna",
  "Arjuna",
  "Sanjaya",
  "Dhritirashtra",
];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createSession(title = "New chat"): ChatSession {
  const now = Date.now();

  return {
    id: createId(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function titleFromQuestion(question: string) {
  const clean = question.replace(/\s+/g, " ").trim();

  if (!clean) {
    return "New chat";
  }

  return clean.length > 42 ? `${clean.slice(0, 42).trim()}...` : clean;
}

function parseApiError(response: Response, fallback: string) {
  const retryAfter = response.headers.get("Retry-After");

  if (response.status === 401) {
    return "The API key is missing or invalid. Check NEXT_PUBLIC_API_KEY.";
  }

  if (response.status === 429) {
    return retryAfter
      ? `Rate limit hit. Try again in ${retryAfter}s.`
      : "Rate limit hit. Please wait a moment and try again.";
  }

  if (response.status === 503) {
    return "The RAG service is still starting. Try again in a few minutes.";
  }

  if (response.status === 400) {
    return "The question or filters are invalid. Shorten the prompt or adjust filters.";
  }

  return fallback;
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json();

    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
  } catch {
    return parseApiError(response, "The request failed.");
  }

  return parseApiError(response, "The request failed.");
}

async function streamAsk(
  body: {
    question: string;
    session_id?: string;
    context_limit: number;
    chapter_filter: number | null;
    speaker_filter: SpeakerFilter | null;
  },
  onEvent: (event: AskStreamEvent) => void,
  signal: AbortSignal
) {
  const response = await fetch(`${API_BASE_URL}/api/v1/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      ...body,
      stream: true,
      speaker_filter: body.speaker_filter || null,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (!response.body) {
    throw new Error("The API did not return a readable stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line.startsWith("data:")) {
        continue;
      }

      const data = line.slice(5).trim();

      if (!data) {
        continue;
      }

      onEvent(JSON.parse(data));
    }
  }
}

export default function ChatInterface() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [input, setInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextLimit, setContextLimit] = useState(5);
  const [chapterFilter, setChapterFilter] = useState<number | null>(null);
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerFilter>("");
  const { initialQuestion, setInitialQuestion } = useChatContext();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  );

  const groupedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  const updateSession = useCallback(
    (
      sessionId: string,
      updater: (session: ChatSession) => ChatSession
    ) => {
      setSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.id === sessionId ? updater(session) : session
        )
      );
    },
    []
  );

  const beginNewChat = useCallback(() => {
    const session = createSession();
    setSessions((currentSessions) => [session, ...currentSessions]);
    setActiveSessionId(session.id);
    setInput("");
  }, []);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      queueMicrotask(() => setIsSidebarOpen(true));
    }

    try {
      const savedSessions = localStorage.getItem(STORAGE_KEY);
      const savedActiveSessionId = localStorage.getItem(ACTIVE_STORAGE_KEY);
      const parsedSessions = savedSessions
        ? (JSON.parse(savedSessions) as ChatSession[])
        : [];

      queueMicrotask(() => {
        if (parsedSessions.length > 0) {
          setSessions(parsedSessions);
          setActiveSessionId(savedActiveSessionId || parsedSessions[0].id);
        } else {
          const session = createSession();
          setSessions([session]);
          setActiveSessionId(session.id);
        }
      });
    } catch {
      queueMicrotask(() => {
        const session = createSession();
        setSessions([session]);
        setActiveSessionId(session.id);
      });
    }
  }, []);

  useEffect(() => {
    if (sessions.length === 0) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_STORAGE_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeSession?.messages, isStreaming]);

  useEffect(() => {
    if (!textAreaRef.current) {
      return;
    }

    textAreaRef.current.style.height = "auto";
    textAreaRef.current.style.height = `${Math.min(
      textAreaRef.current.scrollHeight,
      180
    )}px`;
  }, [input]);

  const submitQuestion = useCallback(
    async (question: string, options?: { regenerate?: boolean }) => {
      const cleanQuestion = question.trim();

      if (!cleanQuestion || isStreaming) {
        return;
      }

      let targetSession = activeSession;

      if (!targetSession) {
        targetSession = createSession(titleFromQuestion(cleanQuestion));
        setSessions((currentSessions) => [targetSession!, ...currentSessions]);
        setActiveSessionId(targetSession.id);
      }

      const sessionId = targetSession.id;
      const assistantMessageId = createId();
      const now = Date.now();
      const messagesForRegeneration =
        targetSession.messages[targetSession.messages.length - 1]?.sender ===
        "assistant"
          ? targetSession.messages.slice(0, -1)
          : targetSession.messages;
      const nextMessages: ChatMessage[] = options?.regenerate
        ? [
            ...messagesForRegeneration,
            {
              id: assistantMessageId,
              sender: "assistant",
              content: "",
              status: "streaming",
            },
          ]
        : [
            ...targetSession.messages,
            {
              id: createId(),
              sender: "user",
              content: cleanQuestion,
              status: "complete",
            },
            {
              id: assistantMessageId,
              sender: "assistant",
              content: "",
              status: "streaming",
            },
          ];

      updateSession(sessionId, (session) => ({
        ...session,
        title:
          session.messages.length === 0
            ? titleFromQuestion(cleanQuestion)
            : session.title,
        messages: nextMessages,
        updatedAt: now,
      }));

      setInput("");
      setIsStreaming(true);
      abortRef.current = new AbortController();

      try {
        await streamAsk(
          {
            question: cleanQuestion,
            session_id: targetSession.apiSessionId,
            context_limit: contextLimit,
            chapter_filter: chapterFilter,
            speaker_filter: speakerFilter || null,
          },
          (event) => {
            if (event.token) {
              updateSession(sessionId, (session) => ({
                ...session,
                messages: session.messages.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: `${message.content}${event.token}`,
                      }
                    : message
                ),
                updatedAt: Date.now(),
              }));
            }

            if (event.done) {
              updateSession(sessionId, (session) => ({
                ...session,
                apiSessionId: event.session_id || session.apiSessionId,
                messages: session.messages.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        status: "complete",
                      }
                    : message
                ),
                updatedAt: Date.now(),
              }));

            }
          },
          abortRef.current.signal
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          updateSession(sessionId, (session) => ({
            ...session,
            messages: session.messages.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: message.content || "Stopped.",
                    status: "complete",
                  }
                : message
            ),
          }));
          return;
        }

        const message =
          error instanceof Error && error.message === "Failed to fetch"
            ? `Could not reach the API at ${API_BASE_URL}. Make sure the backend is running.`
            : error instanceof Error
              ? error.message
              : "Something went wrong.";

        updateSession(sessionId, (session) => ({
          ...session,
          messages: session.messages.map((chatMessage) =>
            chatMessage.id === assistantMessageId
              ? {
                  ...chatMessage,
                  content: message,
                  status: "error",
                }
              : chatMessage
          ),
          updatedAt: Date.now(),
        }));

        toast({
          title: "Could not stream answer",
          description: message,
          variant: "destructive",
        });
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
      }
    },
    [
      activeSession,
      chapterFilter,
      contextLimit,
      isStreaming,
      speakerFilter,
      updateSession,
    ]
  );

  useEffect(() => {
    if (!initialQuestion || isStreaming) {
      return;
    }

    queueMicrotask(() => {
      submitQuestion(initialQuestion);
      setInitialQuestion("");
    });
  }, [initialQuestion, isStreaming, setInitialQuestion, submitQuestion]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuestion(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuestion(input);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  const deleteSession = (sessionId: string) => {
    setSessions((currentSessions) => {
      const nextSessions = currentSessions.filter(
        (session) => session.id !== sessionId
      );

      if (activeSessionId === sessionId) {
        const nextActiveSession = nextSessions[0] || createSession();
        setActiveSessionId(nextActiveSession.id);
        return nextSessions.length > 0 ? nextSessions : [nextActiveSession];
      }

      return nextSessions;
    });

    toast({
      title: "Chat deleted",
      description: "The session was removed from this browser.",
    });
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(""), 1600);
      toast({
        title: "Copied",
        description: "Message copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard permission was not available.",
        variant: "destructive",
      });
    }
  };

  const regenerateLastAnswer = () => {
    const messages = activeSession?.messages || [];
    const lastUserMessage = [...messages]
      .reverse()
      .find((message) => message.sender === "user");

    if (!lastUserMessage) {
      return;
    }

    submitQuestion(lastUserMessage.content, { regenerate: true });
  };

  const messages = activeSession?.messages || [];
  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#111111] text-[#ececec]">
      <PromptInfoPopup />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col border-r border-white/10 bg-[#050505] transition-transform duration-200 lg:static ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 text-[15px] font-semibold">
            <BookOpen className="h-5 w-5 text-emerald-300" />
            Gita AI
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-300 hover:bg-white/10 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1 px-3 pb-3">
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full justify-start rounded-lg bg-white/10 px-3 text-sm text-white hover:bg-white/15"
            onClick={beginNewChat}
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
          <div className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-zinc-300">
            <Search className="h-4 w-4" />
            Sessions saved locally
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Recent
          </div>
          <div className="space-y-1">
            {groupedSessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-1 rounded-lg pr-1 transition ${
                  session.id === activeSessionId
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveSessionId(session.id)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                    session.id === activeSessionId
                      ? "text-white"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate">
                    {session.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="rounded-md p-1.5 text-zinc-500 opacity-100 hover:bg-white/10 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Delete ${session.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </aside>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3 lg:px-5">
          <div className="flex items-center gap-2">
            {!isSidebarOpen && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-zinc-300 hover:bg-white/10 hover:text-white"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <PanelLeftOpen className="hidden h-4 w-4 lg:block" />
                <Menu className="h-4 w-4 lg:hidden" />
              </Button>
            )}
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-100 hover:bg-white/5"
            >
              Gita AI RAG
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-300 hover:bg-white/10 hover:text-white"
              onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
              aria-label="Toggle retrieval settings"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-zinc-300 hover:bg-white/10 hover:text-white"
              onClick={beginNewChat}
              aria-label="New chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {isSettingsOpen && (
          <section className="border-b border-white/10 bg-[#171717] px-4 py-3">
            <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-xs font-medium text-zinc-400">
                Context verses
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={contextLimit}
                  onChange={(event) =>
                    setContextLimit(
                      Math.min(20, Math.max(1, Number(event.target.value)))
                    )
                  }
                  className="h-9 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-emerald-400"
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-zinc-400">
                Chapter
                <select
                  value={chapterFilter || ""}
                  onChange={(event) =>
                    setChapterFilter(
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                  className="h-9 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  <option value="">All chapters</option>
                  {Array.from({ length: 18 }, (_, index) => index + 1).map(
                    (chapter) => (
                      <option key={chapter} value={chapter}>
                        Chapter {chapter}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-zinc-400">
                Speaker
                <select
                  value={speakerFilter}
                  onChange={(event) =>
                    setSpeakerFilter(event.target.value as SpeakerFilter)
                  }
                  className="h-9 w-full rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  {speakers.map((speaker) => (
                    <option key={speaker || "all"} value={speaker}>
                      {speaker || "All speakers"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        )}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6"
        >
          {!hasMessages ? (
            <section className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center text-center">
              <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                What would you like to understand from the Gita?
              </h1>
              <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-zinc-200 transition hover:border-emerald-300/40 hover:bg-white/[0.07]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="mx-auto max-w-3xl space-y-8 pb-4">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`group flex gap-4 ${
                    message.sender === "user" ? "justify-end" : ""
                  }`}
                >
                  {message.sender === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                      <BookOpen className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`min-w-0 ${
                      message.sender === "user"
                        ? "max-w-[85%] rounded-2xl bg-[#2f2f2f] px-4 py-3 text-white"
                        : "flex-1 text-zinc-100"
                    }`}
                  >
                    {message.sender === "user" ? (
                      <p className="whitespace-pre-wrap text-[15px] leading-7">
                        {message.content}
                      </p>
                    ) : (
                      <div
                        className={`markdown-response ${
                          message.status === "error"
                            ? "rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-100"
                            : ""
                        }`}
                      >
                        {message.content ? (
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                            Looking through the Gita...
                          </div>
                        )}
                      </div>
                    )}

                    {message.sender === "assistant" &&
                      message.content &&
                      message.status !== "streaming" && (
                        <div className="mt-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:bg-white/10 hover:text-white"
                            onClick={() => copyMessage(message)}
                            aria-label="Copy answer"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:bg-white/10 hover:text-white"
                            onClick={regenerateLastAnswer}
                            aria-label="Regenerate answer"
                            disabled={isStreaming}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-[#111111] px-4 py-4">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/10 bg-[#2a2a2a] p-2 shadow-2xl">
              <Textarea
                ref={textAreaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about the Bhagavad Gita"
                rows={1}
                className="max-h-[180px] min-h-12 resize-none border-0 bg-transparent px-3 py-3 text-[15px] text-white shadow-none outline-none placeholder:text-zinc-400 focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
                  <span className="hidden truncate sm:block">
                    {chapterFilter
                      ? `Chapter ${chapterFilter}`
                      : "All chapters"}
                    {" · "}
                    {speakerFilter || "All speakers"}
                    {" · "}
                    {contextLimit} verses
                  </span>
                </div>
                {isStreaming ? (
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-white text-black hover:bg-zinc-200"
                    onClick={stopStreaming}
                    aria-label="Stop response"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-600 disabled:text-zinc-400"
                    disabled={!input.trim()}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-zinc-500">
              Responses are generated from retrieved Gita context and may need
              review.
            </p>
          </form>
        </footer>
      </main>

      {isSettingsOpen && (
        <button
          type="button"
          className="fixed right-4 top-16 z-20 rounded-full bg-white/10 p-2 text-zinc-300 hover:bg-white/15 lg:hidden"
          onClick={() => setIsSettingsOpen(false)}
          aria-label="Close settings"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
