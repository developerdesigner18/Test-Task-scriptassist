import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../src/modules/tasks/tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from '../src/modules/tasks/entities/task.entity';
import { Repository } from 'typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

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
      const createTaskDto = { title: 'Test Task' };
      const userId = '1';
      const task = { id: '1', ...createTaskDto, user: { id: userId } };

      jest.spyOn(repository, 'create').mockReturnValue(task as any);
      jest.spyOn(repository, 'save').mockResolvedValue(task as any);

      expect(await service.create(createTaskDto as any, userId)).toEqual(task);
    });
  });

  describe('findOne', () => {
    it('should find a task', async () => {
      const taskId = '1';
      const userId = '1';
      const task = { id: taskId, user: { id: userId } };

      jest.spyOn(repository, 'findOne').mockResolvedValue(task as any);

      expect(await service.findOne(taskId, userId)).toEqual(task);
    });
  });
});
