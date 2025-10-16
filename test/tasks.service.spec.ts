import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../src/modules/tasks/entities/task.entity';
import { Repository } from 'typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CreateTaskDto } from '../src/modules/tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../src/modules/tasks/dto/update-task.dto';
import { TaskStatus } from '../src/modules/tasks/enums/task-status.enum';

describe('TasksService', () => {
  let service: TasksService;
  let repository: Repository<Task>;
  let queue: Queue;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useClass: Repository,
        },
        {
          provide: getQueueToken('task-processing'),
          useValue: {
            add: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    repository = module.get<Repository<Task>>(getRepositoryToken(Task));
    queue = module.get<Queue>(getQueueToken('task-processing'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createTaskDto: CreateTaskDto = { title: 'Test Task' };
      const userId = '1';
      const task = { id: '1', ...createTaskDto, user: { id: userId } };

      jest.spyOn(repository, 'create').mockReturnValue(task as Task);
      jest.spyOn(repository, 'save').mockResolvedValue(task as Task);

      expect(await service.create(createTaskDto, userId)).toEqual(task);
    });
  });

  describe('findOne', () => {
    it('should find a task', async () => {
      const taskId = '1';
      const userId = '1';
      const task = { id: taskId, user: { id: userId } };

      jest.spyOn(repository, 'findOne').mockResolvedValue(task as Task);

      expect(await service.findOne(taskId, userId)).toEqual(task);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const taskId = '1';
      const userId = '1';
      const updateTaskDto: UpdateTaskDto = { title: 'Updated Task' };
      const existingTask = { id: taskId, title: 'Test Task', user: { id: userId } };
      const updatedTask = { ...existingTask, ...updateTaskDto };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingTask as Task);
      jest.spyOn(repository, 'save').mockResolvedValue(updatedTask as Task);

      expect(await service.update(taskId, updateTaskDto, userId)).toEqual(updatedTask);
    });
  });

  describe('remove', () => {
    it('should remove a task', async () => {
      const taskId = '1';
      const userId = '1';
      const task = { id: taskId, user: { id: userId } };

      jest.spyOn(service, 'findOne').mockResolvedValue(task as Task);
      jest.spyOn(repository, 'remove').mockResolvedValue(undefined);

      await service.remove(taskId, userId);
      expect(repository.remove).toHaveBeenCalledWith(task);
    });
  });

  describe('findAll', () => {
    it('should find all tasks with filtering', async () => {
      const tasks = [{ id: '1', status: 'pending' }, { id: '2', status: 'completed' }];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([tasks, tasks.length]),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.findAll({ page: 1, limit: 10, status: TaskStatus.PENDING });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.status = :status', { status: TaskStatus.PENDING });
      expect(result.data).toEqual(tasks);
      expect(result.total).toEqual(tasks.length);
    });
  });
});
