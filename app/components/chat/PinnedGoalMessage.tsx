import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface PinnedGoalMessageProps {
  initialMessage: string;
  isScrolled: boolean;
}

export default function PinnedGoalMessage({
  initialMessage,
}: PinnedGoalMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative -mx-4 md:-mx-6 mb-4">
      <motion.div
        className={`font-ppsupply sticky top-0 z-10 w-full`}
        style={{
          backgroundColor: "rgba(245, 240, 255, 0.75)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #CAC8C7",
          width: "100%",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(245, 240, 255, 0.85), rgba(245, 240, 255, 0))",
            opacity: 0.6,
            filter: "blur(2px)",
            width: "100%",
            height: "32px",
            left: "0",
            right: "0",
            bottom: "-24px",
            zIndex: 0,
          }}
        ></div>

        <div className="p-6">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors mb-2"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Initial instructions prompt
          </button>
          
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="break-words overflow-hidden text-ellipsis max-w-full text-sm text-gray-600 mt-2">
                {initialMessage}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
