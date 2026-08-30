import { Quest, Task } from "@/types";

export const checkQuestProgress = (quest: Quest, tasks: Task[]): Quest => {
  let completedCount = 0;
  let totalST = 0;
  let hardTasks = 0;

  tasks.forEach((task) => {
    if (task.status === "completed") {
      completedCount++;
      totalST += task.reward;
      if (task.difficulty === "hard" || task.difficulty === "elite") {
        hardTasks++;
      }
    }
  });

  const objectives = quest.objectives.map((obj) => {
    let current = 0;
    let target = obj.target;

    switch (obj.type) {
      case "complete_tasks":
        current = completedCount;
        break;
      case "earn_st":
        current = totalST;
        break;
      case "hard_tasks":
        current = hardTasks;
        break;
      case "maintain_streak":
        current = obj.current;
        break;
      default:
        current = obj.current;
    }

    return { ...obj, current, target, completed: current >= target };
  });

  const allCompleted = objectives.every((obj) => obj.completed);

  return {
    ...quest,
    objectives,
    status: allCompleted ? "completed" : "active",
  };
};

export const getQuestProgress = (quest: Quest): number => {
  const total = quest.objectives.reduce((sum, obj) => sum + obj.target, 0);
  const current = quest.objectives.reduce((sum, obj) => sum + Math.min(obj.current, obj.target), 0);
  return total > 0 ? current / total : 0;
};
