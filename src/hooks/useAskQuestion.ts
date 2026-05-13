"use client";

import { useMutation } from "@tanstack/react-query";

type AskResponse = {
  answer: string;
  citations?: unknown[];
  model_used?: string;
  context_chunks_used?: number;
  query_time_ms?: number;
  session_id: string;
};

export const useAskQuestion = (
  onSuccess: (data: AskResponse) => void,
  onError: (error: Error) => void
) => {
  return useMutation({
    mutationFn: async (question: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question }),
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      return response.json();
    },
    onSuccess,
    onError,
  });
};
