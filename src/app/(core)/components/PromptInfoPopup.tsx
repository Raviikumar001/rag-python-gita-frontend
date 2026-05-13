"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function PromptInfoPopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem("hasSeenPromptInfo");
    if (!hasSeenPopup) {
      queueMicrotask(() => setShow(true));
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("hasSeenPromptInfo", "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card className="max-h-[calc(100vh-2rem)] w-[min(420px,calc(100vw-2rem))] overflow-y-auto border-white/10 bg-[#1f1f1f] text-white shadow-2xl">
          <CardHeader className="relative pb-2">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 text-zinc-400 hover:bg-white/10 hover:text-white"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold text-lg">
              Better Gita Answers
            </h3>
            <p className="text-sm text-zinc-400">
              A few notes before you begin
            </p>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 space-y-1.5 text-sm text-zinc-400">
              <li>Ask focused questions for more useful retrieved context.</li>
              <li>Use chapter and speaker filters when you need precision.</li>
              <li>Follow-up messages stay linked to the selected session.</li>
              <li>Responses can contain mistakes, so review important details.</li>
              <li>Dataset: Gutenberg EBook of The Bhagavad-Gita.</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-white text-black hover:bg-zinc-200"
              onClick={handleClose}
            >
              Got it
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    )}
  </AnimatePresence>
  );
}
