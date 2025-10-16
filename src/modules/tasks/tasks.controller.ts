import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, HttpException, HttpStatus, Req } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit({ limit: 100, windowMs: 60000 })
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'The task has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createTaskDto: CreateTaskDto, @Req() req:Request | any) {
    return this.tasksService.create(createTaskDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Find all tasks with optional filtering' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Return all tasks.' })
  async findAll(@Query() query: { status?: TaskStatus; priority?: TaskPriority; page?: number; limit?: number }) {
    const { status, priority, page = 1, limit = 10 } = query;
    return this.tasksService.findAll({
      status,
      priority,
      page,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  @ApiResponse({ status: 200, description: 'Return task statistics.' })
  async getStats() {
    return this.tasksService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a task by ID' })
  @ApiResponse({ status: 200, description: 'Return the task.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async findOne(@Param('id') id: string, @Req() req:Request | any) {
    return this.tasksService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'The task has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Req() req:Request | any) {
    return this.tasksService.update(id, updateTaskDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'The task has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  remove(@Param('id') id: string, @Req() req:Request | any) {
    return this.tasksService.remove(id, req.user.id);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Batch process multiple tasks' })
  @ApiResponse({ status: 200, description: 'Batch process completed.' })
  async batchProcess(@Body() operations: { tasks: string[], action: string }, @Req() req:Request | any) {
    const { tasks: taskIds, action } = operations;
    const results = [];

    for (const taskId of taskIds) {
      try {
        let result;

        switch (action) {
          case 'complete':
            result = await this.tasksService.update(taskId, { status: TaskStatus.COMPLETED }, req.user.id);
            break;
          case 'delete':
            result = await this.tasksService.remove(taskId, req.user.id);
            break;
          default:
            throw new HttpException(`Unknown action: ${action}`, HttpStatus.BAD_REQUEST);
        }

        results.push({ taskId, success: true, result });
      } catch (error) {
        results.push({
          taskId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
} 