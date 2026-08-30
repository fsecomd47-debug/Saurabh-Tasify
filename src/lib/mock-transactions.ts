import { Transaction } from "@/types";

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "txn-1", type: "earning", amount: 500, title: "Deep Work Complete", context: "Hard Task • Rare", createdAt: hoursAgo(2), category: "work", playerName: "Saurabh", isCriticalHit: true, xpEarned: 120 },
  { id: "txn-2", type: "earning", amount: 250, title: "Study Session", context: "Medium Task", createdAt: hoursAgo(5), category: "study", playerName: "Saurabh", xpEarned: 60 },
  { id: "txn-3", type: "achievement", amount: 100, title: "Achievement Unlocked", context: "Centurion", createdAt: hoursAgo(8), playerName: "Saurabh" },
  { id: "txn-4", type: "spending", amount: -150, title: "Netflix Break", context: "Redeemed from Vault", createdAt: daysAgo(1), playerName: "Saurabh" },
  { id: "txn-5", type: "bounty", amount: -200, title: "Task Bounty Sent", context: "Gym Challenge to Alex", createdAt: daysAgo(1), playerName: "Alex" },
  { id: "txn-6", type: "earning", amount: 750, title: "Project Milestone", context: "Hard Task", createdAt: daysAgo(2), category: "work", playerName: "Saurabh", xpEarned: 120 },
  { id: "txn-7", type: "quest", amount: 500, title: "Weekly Quest Complete", context: "7-Day Productivity Quest", createdAt: daysAgo(3), playerName: "Saurabh", xpEarned: 250 },
  { id: "txn-8", type: "levelup", amount: 0, title: "Level Up!", context: "Reached Level 18", createdAt: daysAgo(4), playerName: "Saurabh" },
];
