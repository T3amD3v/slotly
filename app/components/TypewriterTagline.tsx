"use client";
import { TypewriterEffectSmooth } from "../ui/typewriter-effect";

export function TypewriterTagline() {
  const words = [
    {
      text: "Meetings Suck—Scheduling Shouldn't.",
      className: "text-white",
    },
  ];
  
  return (
    <div className="w-full h-12 mb-12">
      <TypewriterEffectSmooth 
        words={words} 
        className="text-2xl font-bold"
      />
    </div>
  );
} 