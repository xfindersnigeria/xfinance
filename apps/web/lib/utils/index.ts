import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getInitials(name: string): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0][0]?.toUpperCase() || "";
  }
  if (words.length === 2) {
    return (
      (words[0][0]?.toUpperCase() || "") +
      (words[1][0]?.toUpperCase() || "")
    );
  }
  // For 3 or more words, take first two letters of each word
  return words
    .map(word => (word.slice(0, 2).toUpperCase()))
    .join("");
}