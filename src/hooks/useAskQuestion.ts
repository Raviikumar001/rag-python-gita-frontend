"use client";

import { useMutation } from "@tanstack/react-query";

export const useAskQuestion = (
  onSuccess: (data: any) => void,
  onError: (error: any) => void
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
