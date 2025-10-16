// src/database/seeding/seed-data/seed-Task-Data.ts
import { v4 as uuidv4 } from 'uuid';
import dataSource from "../../data-source";
import { Task } from "../../../modules/tasks/entities/task.entity";
import { TaskPriority } from "../../../modules/tasks/enums/task-priority.enum";
import { TaskStatus } from "../../../modules/tasks/enums/task-status.enum";
import { User } from "../../../modules/users/entities/user.entity";

/**
 * Get a random element from an array
 */
function getRandomArrayElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a random date within the given day range
 */
function randomDateWithinDays(fromDays: number, toDays: number) {
  const today = new Date();
  const diff = Math.floor(Math.random() * (toDays - fromDays + 1)) + fromDays;
  return new Date(today.setDate(today.getDate() + diff));
}

async function seedTasks() {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      console.log('Database connected');
    }

    const userRepo = dataSource.getRepository(User);
    const taskRepo = dataSource.getRepository(Task);

    // Fetch all users
    const users = await userRepo.find();
    if (users.length === 0) {
      console.error('No users found. Seed users first!');
      return;
    }

    const actionWords = ['Design', 'Implement', 'Review', 'Setup', 'Complete'];
    const objectWords = ['API', 'Database', 'Frontend', 'Backend', 'Docs'];
    const tasks: Partial<Task>[] = [];

    for (let i = 0; i < 2000; i++) {
      const randomUser = getRandomArrayElement(users);

      tasks.push({
        id: uuidv4(),
        title: `Task #${i + 1} - ${getRandomArrayElement(actionWords)} ${getRandomArrayElement(objectWords)}`,
        description: `This is the description for task #${i + 1}`,
        status: getRandomArrayElement([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
        priority: getRandomArrayElement([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]),
        dueDate: randomDateWithinDays(-10, 30),
        userId: randomUser.id,
      });
    }

    await taskRepo.save(tasks);
    console.log(' Successfully seeded 2000 tasks with random status & priority');

    await dataSource.destroy();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error seeding tasks:', err);
    await dataSource.destroy();
  }
}

seedTasks();
