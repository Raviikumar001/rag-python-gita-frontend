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
      setShow(true);
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
          <Card className="w-[350px] shadow-lg">
            <CardHeader className="relative pb-2">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-lg">
                Writing Effective Prompts
              </h3>
              <p className="text-sm text-muted-foreground">
                Follow these tips for better results
              </p>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Specify the API:</strong> Clearly state which API you
                  need.
                </li>
                <li>
                  <strong>Include Key Details:</strong> Mention relevant info
                  like filters while prompting.
                </li>
                <li>
                  <strong>List Required Fields:</strong> Specify the data fields
                  you want.
                </li>
                <li>
                  <strong>For errors:</strong> Specify the exact data required
                  to resolve the error.
                </li>
                <li>
                  <strong>Be Concise:</strong> Keep prompts focused to ensure
                  clear responses.
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleClose}>
                Got it
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}