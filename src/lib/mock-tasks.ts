import { Task } from "@/types";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const hoursFromNow = (n: number) => new Date(now.getTime() + n * 3600000).toISOString();

export const MOCK_TASKS: Task[] = [
  { id: "task-1", title: "Deep Work Session", description: "60 minutes of focused coding", reward: 350, xp: 120, status: "active", category: "work", difficulty: "hard", rarity: "rare", streakEligible: true, createdAt: daysAgo(0), deadline: hoursFromNow(6) },
  { id: "task-2", title: "Study 45 minutes", description: "Review course material", reward: 200, xp: 60, status: "active", category: "study", difficulty: "medium", rarity: "common", streakEligible: true, createdAt: daysAgo(0), deadline: hoursFromNow(12) },
  { id: "task-3", title: "Morning Workout", description: "30 min exercise", reward: 150, xp: 40, status: "active", category: "health", difficulty: "easy", rarity: "common", streakEligible: true, createdAt: daysAgo(0) },
  { id: "task-4", title: "Finish Project Milestone", description: "Complete the main deliverable", reward: 800, xp: 250, status: "active", category: "work", difficulty: "elite", rarity: "epic", streakEligible: true, createdAt: daysAgo(0), deadline: hoursFromNow(8) },
  { id: "task-5", title: "Read 20 pages", description: "Book reading goal", reward: 100, xp: 25, status: "completed", category: "study", difficulty: "easy", rarity: "common", streakEligible: true, createdAt: daysAgo(1), completedAt: daysAgo(0) },
  { id: "task-6", title: "Write journal entry", description: "Daily reflection", reward: 75, xp: 25, status: "active", category: "personal", difficulty: "easy", rarity: "common", streakEligible: true, createdAt: daysAgo(0), isDecaying: true },
  { id: "task-7", title: "Meditate 15 minutes", description: "Mindfulness session", reward: 100, xp: 25, status: "completed", category: "health", difficulty: "easy", rarity: "common", streakEligible: true, createdAt: daysAgo(3), completedAt: daysAgo(2) },
  { id: "task-8", title: "Budget Review", description: "Weekly expense check", reward: 200, xp: 60, status: "active", category: "finance", difficulty: "medium", rarity: "common", streakEligible: true, createdAt: daysAgo(0) },
  { id: "task-9", title: "Legendary Challenge", description: "Complete the impossible task", reward: 2000, xp: 500, status: "available", category: "work", difficulty: "elite", rarity: "legendary", streakEligible: true, createdAt: daysAgo(0) },
  { id: "task-10", title: "Learn New Skill", description: "Study for 90 minutes", reward: 400, xp: 120, status: "active", category: "study", difficulty: "hard", rarity: "rare", streakEligible: true, createdAt: daysAgo(0) },
];
