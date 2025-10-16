import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TaskStatus } from './enums/task-status.enum';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectQueue('task-processing')
    private taskQueue: Queue,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const task = this.tasksRepository.create({ ...createTaskDto, user: { id: userId } });
    const savedTask = await this.tasksRepository.save(task);

    try {
      await this.taskQueue.add('task-status-update', {
        taskId: savedTask.id,
        status: savedTask.status,
      });
    } catch (error) {
      this.logger.error(`Failed to add task to queue: ${error.message}`, error.stack);
    }

    return savedTask;
  }

  async findAll(options: {
    status?: TaskStatus;
    priority?: any;
    page: number;
    limit: number;
  }): Promise<{ data: Task[]; count: number; total: number; page: number; limit: number }> {
    const { status, priority, page, limit } = options;
    const query = this.tasksRepository.createQueryBuilder('task');

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    const [data, total] = await query
      .leftJoinAndSelect('task.user', 'user')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      count: data.length,
      total,
      page,
      limit,
    };
  }



  async findOne(id: string, userId?: string): Promise<Task> {
  const where = userId
    ? { id, user: { id: userId } }
    : { id };

  const task = await this.tasksRepository.findOne({
    where,
    relations: ['user'],
  });

  if (!task) {
    throw new NotFoundException(`Task with ID ${id} not found`);
  }

  return task;
}


  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.findOne(id, userId);

    const originalStatus = task.status;

    // Directly update each field individually
    if (updateTaskDto.title) task.title = updateTaskDto.title;
    if (updateTaskDto.description) task.description = updateTaskDto.description;
    if (updateTaskDto.status) task.status = updateTaskDto.status;
    if (updateTaskDto.priority) task.priority = updateTaskDto.priority;
    if (updateTaskDto.dueDate) task.dueDate = updateTaskDto.dueDate;

    const updatedTask = await this.tasksRepository.save(task);

    if (originalStatus !== updatedTask.status) {
      try {
        await this.taskQueue.add('task-status-update', {
          taskId: updatedTask.id,
          status: updatedTask.status,
        });
      } catch (error) {
        this.logger.error(`Failed to add task to queue on update: ${error.message}`, error.stack);
      }
    }

    return updatedTask;
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOne(id, userId);
    await this.tasksRepository.remove(task);
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    // Inefficient implementation: doesn't use proper repository patterns
    const query = 'SELECT * FROM tasks WHERE status = $1';
    return this.tasksRepository.query(query, [status]);
  }

  async updateStatus(id: string, status: string, userId?: string): Promise<Task> {
    const task = userId ? await this.findOne(id, userId) : await this.findOne(id);
    task.status = status as any;
    return this.tasksRepository.save(task);
  }


  async getStats() {
    const stats = await this.tasksRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany();

    const result = {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
    };

    stats.forEach(stat => {
      switch (stat.status) {
        case TaskStatus.COMPLETED:
          result.completed = parseInt(stat.count, 10);
          break;
        case TaskStatus.IN_PROGRESS:
          result.inProgress = parseInt(stat.count, 10);
          break;
        case TaskStatus.PENDING:
          result.pending = parseInt(stat.count, 10);
          break;
      }
      result.total += parseInt(stat.count, 10);
    });

    return result;
  }
}
