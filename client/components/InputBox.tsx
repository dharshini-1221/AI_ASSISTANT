"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InputBoxProps {
  onSend: (message: string) => void;
  onSkip?: () => void;
  disabled?: boolean;
}

export function InputBox({
  onSend,
  onSkip,
  disabled,
}: InputBoxProps) {
  const [input, setInput] = useState("");

  // ─────────────────────────────────────────────────────────
  // Send Answer
  // ─────────────────────────────────────────────────────────

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
    }
  };

  // ─────────────────────────────────────────────────────────
  // Skip Question
  // ─────────────────────────────────────────────────────────

  const handleSkip = () => {
    if (disabled || !onSkip) {
      return;
    }

    setInput("");
    onSkip();
  };

  // ─────────────────────────────────────────────────────────
  // Enter Key
  // ─────────────────────────────────────────────────────────

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Type your answer..."
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={handleKeyPress}
          disabled={disabled}
          className="flex-1"
        />

        <Button
          variant="outline"
          onClick={handleSkip}
          disabled={disabled || !onSkip}
        >
          Skip
        </Button>

        <Button
          onClick={handleSend}
          disabled={
            disabled ||
            !input.trim()
          }
        >
          Send
        </Button>
      </div>
    </div>
  );
}