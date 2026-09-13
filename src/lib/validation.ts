import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(60, "Name is too long")
    .regex(/^[\p{L}\p{M}'.\- ]+$/u, "Name contains invalid characters"),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long")
    .regex(/[a-z]/, "Add a lowercase letter")
    .regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[0-9]/, "Add a number"),
  role: z.enum(["STUDENT", "LECTURER"]).default("STUDENT"),
  department: z.string().trim().max(80).optional().nullable(),
  year: z.string().trim().max(20).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(100),
});

export const googleSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(60),
  avatarUrl: z.string().trim().max(300).optional().nullable(),
  role: z.enum(["STUDENT", "LECTURER"]).default("STUDENT"),
  department: z.string().trim().max(80).optional().nullable(),
});

export const postSchema = z.object({
  content: z.string().trim().min(1, "Say something first").max(2000, "Post is too long (max 2000)"),
  mediaUrl: z.string().max(300).optional().nullable(),
  mediaType: z.enum(["image", "video"]).optional().nullable(),
  groupId: z.string().max(60).optional().nullable(),
  channelId: z.string().max(60).optional().nullable(),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Write a comment").max(600, "Comment is too long"),
});

export const reactionSchema = z.enum(["LIKE", "LOVE", "FIRE", "LAUGH", "CLAP"]);

export const eventSchema = z.object({
  title: z.string().trim().min(3, "Give the event a title").max(120),
  description: z.string().trim().min(10, "Describe the event (min 10 chars)").max(3000),
  location: z.string().trim().min(2, "Where is it happening?").max(120),
  category: z.enum(["CAMPUS", "ACADEMIC", "SPORTS", "CULTURE", "CLUB", "CAREER"]).default("CAMPUS"),
  startsAt: z.string().datetime({ offset: true }).or(z.string().min(10)),
  endsAt: z.string().datetime({ offset: true }).or(z.string().min(10)).optional().nullable(),
  coverUrl: z.string().max(300).optional().nullable(),
});

export const groupSchema = z.object({
  name: z.string().trim().min(3, "Group name too short").max(60),
  description: z.string().trim().max(500).optional().nullable(),
  emoji: z.string().trim().max(8).default("💬"),
  isPublic: z.boolean().default(true),
});

export const channelSchema = z.object({
  name: z.string().trim().min(3, "Channel name too short").max(60),
  description: z.string().trim().max(500).optional().nullable(),
});

export const messageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  mediaUrl: z.string().max(300).optional().nullable(),
  mediaType: z.enum(["image", "video"]).optional().nullable(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  bio: z.string().trim().max(300).optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),
  year: z.string().trim().max(20).optional().nullable(),
  avatarUrl: z.string().max(300).optional().nullable(),
  coverUrl: z.string().max(300).optional().nullable(),
});

export const reportSchema = z.object({
  targetType: z.enum(["POST", "USER", "COMMENT"]),
  targetId: z.string().max(60),
  reason: z.string().trim().min(3, "Tell us why").max(300),
});

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}
