"use client";

import { cn } from "@/app/utils/cn";
import { useEffect, useState } from "react";

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState(0);
  const [isCursorVisible, setIsCursorVisible] = useState(true);

  // Blink cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsCursorVisible((prev) => !prev);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Typewriter effect
  useEffect(() => {
    // Join all words to create one long text
    const fullText = words[currentWord].text;
    
    // If we've typed the entire word
    if (currentIndex === fullText.length) {
      // Wait longer at the end of a word
      const timeout = setTimeout(() => {
        // Move to next word
        setCurrentWord((prev) => (prev + 1) % words.length);
        // Reset typing position
        setCurrentIndex(0);
        // Clear the text
        setCurrentText("");
      }, 1500);
      
      return () => clearTimeout(timeout);
    }
    
    // Type next character
    const timeout = setTimeout(() => {
      setCurrentText(prev => prev + fullText[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, 100); // Typing speed
    
    return () => clearTimeout(timeout);
  }, [currentIndex, currentWord, words]);

  return (
    <div className={cn("flex items-center justify-center relative", className)}>
      <div className="inline-block">
        <span className={cn("", words[currentWord].className)}>
          {currentText}
        </span>
        <span
          className={cn(
            "border-r-2 ml-0.5 h-6 border-blue-500 dark:border-blue-500 inline-block",
            cursorClassName,
            isCursorVisible ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    </div>
  );
}; 