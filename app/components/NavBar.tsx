"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Layers, X } from "lucide-react";

interface NavBarProps {
  title?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  showGitHubButton?: boolean;
  className?: string;
}

export default function NavBar({
  title = "AdOps Agent",
  showCloseButton = false,
  onClose,
  showGitHubButton = true,
  className = "",
}: NavBarProps) {
  return (
    <motion.nav
      className={`flex justify-between items-center px-4 py-3 sm:px-8 sm:py-4 bg-white border-b border-[#CAC8C7] shadow-sm relative z-10 ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      style={{
        backgroundColor: "#ffffff",
      }}
    >
      <div className="flex items-center gap-2">
        <a
          href="https://www.digitalremedy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200"
        >
          <Image
            src="/favicon.svg"
            alt="Gemini Browser"
            className="w-8 h-8"
            width={32}
            height={32}
          />
          <span className="font-ppsupply text-xl font-bold text-[#100D0D]">
            {title}
          </span>
        </a>
      </div>
      <div className="flex items-center gap-2">
        {showCloseButton && onClose && (
          <motion.button
            onClick={onClose}
            className="flex items-center justify-center px-3 py-2 bg-[#F6F5F5] gap-1 text-sm font-medium border border-[#CAC8C7] transition-all duration-200 hover:bg-gray-100 h-full"
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center text-[#10100D]">
              Close
              <X
                size={16}
                className="ml-2 text-[#10100D]"
                strokeWidth={2}
              />
            </span>
          </motion.button>
        )}
      </div>
    </motion.nav>
  );
}
