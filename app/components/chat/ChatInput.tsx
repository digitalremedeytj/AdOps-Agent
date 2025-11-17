import { RefObject, useEffect } from "react";
import { motion } from "framer-motion";
import { useYahooDSPAuth } from "@/app/hooks/useYahooDSPAuth";

interface ChatInputProps {
  isWaitingForInput: boolean;
  isAgentFinished: boolean;
  userInput: string;
  setUserInput: (value: string) => void;
  onSubmit: (input: string) => Promise<void>;
  inputRef: RefObject<HTMLInputElement | null>;
}

export default function ChatInput({
  isWaitingForInput,
  isAgentFinished,
  userInput,
  setUserInput,
  onSubmit,
  inputRef,
}: ChatInputProps) {
  const { extractUrls, requiresAuth, triggerAuth } = useYahooDSPAuth();

  // Check for Yahoo DSP URLs when user input changes
  useEffect(() => {
    if (userInput.trim()) {
      const yahooDSPUrls = extractUrls(userInput);
      if (yahooDSPUrls.length > 0) {
        console.log('Detected Yahoo DSP URLs:', yahooDSPUrls);
      }
    }
  }, [userInput, extractUrls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (["quit", "exit", "bye"].includes(userInput.toLowerCase())) {
      // This should be handled by the parent component
      return;
    }

    // Check for Yahoo DSP URLs that require authentication
    const yahooDSPUrls = extractUrls(userInput);
    const unauthenticatedUrls = yahooDSPUrls.filter(urlInfo => 
      requiresAuth(urlInfo.originalUrl)
    );

    if (unauthenticatedUrls.length > 0) {
      // Trigger authentication for the first URL that needs it
      const firstUrl = unauthenticatedUrls[0];
      triggerAuth(firstUrl.originalUrl, 'chat_input');
      return;
    }

    // Proceed with normal submission
    await onSubmit(userInput);
  };

  if (!isWaitingForInput || isAgentFinished) {
    return null;
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onAnimationComplete={() => {
        // Focus input when animation completes
        if (inputRef.current) {
          inputRef.current.focus();
          console.log("Animation complete, focusing input");
        }
      }}
      onSubmit={handleSubmit}
      className="mt-4 flex gap-2 w-full"
    >
      <input
        ref={inputRef}
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 px-2 sm:px-4 py-2 border focus:outline-none focus:ring-1 focus:ring-[var(--primary-accent)] focus:border-transparent font-ppsupply transition-all text-sm sm:text-base"
        style={{
          // backgroundColor: "rgba(245, 240, 255, 0.75)",
          backdropFilter: "blur(8px)",
          borderColor: "rgba(255, 59, 0, 0.5)",
          borderWidth: "2px",
        }}
      />
      <button
        type="submit"
        disabled={!userInput.trim()}
        className="px-2 sm:px-4 py-2 text-white font-ppsupply disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base whitespace-nowrap"
        style={{
          backgroundColor: 'var(--primary-accent)',
          borderRadius: '8px',
        }}
        onMouseEnter={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = '#4845e4';
          }
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.disabled) {
            e.currentTarget.style.backgroundColor = 'var(--primary-accent)';
          }
        }}
      >
        Send
      </button>
    </motion.form>
  );
}
