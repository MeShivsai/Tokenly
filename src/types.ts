export interface Credential {
  id: string;
  name: string;
  username: string | null;
  value: string;
  category: string;
  notes: string;
  expiry_date: string | null;
  created_at: string;
  last_copied: string | null;
}

export type Category =
  | "Git"
  | "Cloud"
  | "DB"
  | "API"
  | "CI/CD"
  | "Other";

export const CATEGORIES: Category[] = [
  "Git", "Cloud", "DB", "API", "CI/CD", "Other"
];

export const CATEGORY_COLORS: Record<string, string> = {
  Git: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Cloud: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DB: "bg-green-500/20 text-green-400 border-green-500/30",
  API: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "CI/CD": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Other: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};