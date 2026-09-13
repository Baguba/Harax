// Shared constants safe for client bundle
export const DEPARTMENTS = [
  "Computer Science",
  "Agricultural Economics",
  "Plant Sciences",
  "Animal & Range Sciences",
  "Medicine",
  "Nursing",
  "Business Management",
  "Economics",
  "Law",
  "Education",
  "Engineering",
  "Veterinary Medicine",
  "Natural Sciences",
  "Social Sciences",
] as const;

export const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"] as const;

export const REACTION_META: Record<string, { emoji: string; label: string; className: string }> = {
  LIKE: { emoji: "👍", label: "Like", className: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300" },
  LOVE: { emoji: "❤️", label: "Love", className: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300" },
  FIRE: { emoji: "🔥", label: "Fire", className: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300" },
  LAUGH: { emoji: "😂", label: "Haha", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  CLAP: { emoji: "👏", label: "Clap", className: "bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-300" },
};

export const EVENT_CATEGORIES = ["CAMPUS", "ACADEMIC", "SPORTS", "CULTURE", "CLUB", "CAREER"] as const;

export const CATEGORY_META: Record<string, { emoji: string; className: string }> = {
  CAMPUS: { emoji: "🏛", className: "bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300" },
  ACADEMIC: { emoji: "🎓", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  SPORTS: { emoji: "⚽", className: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300" },
  CULTURE: { emoji: "🎭", className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300" },
  CLUB: { emoji: "🪩", className: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300" },
  CAREER: { emoji: "💼", className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
};
