import {
  Args,
  Mutation,
  Query,
  Resolver,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards, Inject, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

import { Task } from './entities/task.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { TaskStatus } from './entities/task-status.enum';
import {
  CreateTaskInput,
  TaskFilterInput,
  SubtaskInput,
  TaskSortInput,
} from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { ITask } from './interfaces/task.interface';

@Resolver(() => Task)
@UseGuards(GqlAuthGuard)
export class TasksResolver {
  constructor(
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => WorkspacesService))
    private readonly workspacesService: WorkspacesService,
  ) {}

  @ResolveField(() => Workspace, { nullable: true })
  async workspace(@Parent() task: Task): Promise<Workspace | null> {
    return this.workspacesService.findByTaskId(task.id);
  }

  @Query(() => [Task])
  async getTasks(): Promise<ITask[]> {
    return this.tasksService.findAll();
  }

  @Query(() => [Task])
  async getTasksByUser(
    @Args('userId') userId: string,
    @Args('filters', { nullable: true }) filters?: TaskFilterInput,
    @Args('sort', { nullable: true }) sort?: TaskSortInput,
  ): Promise<ITask[]> {
    return this.tasksService.findAllByUser(userId, filters, sort);
  }

  @Query(() => Task)
  async getTask(@Args('id') id: string): Promise<ITask> {
    return this.tasksService.findOne(id);
  }

  @Query(() => [Task])
  async getTaskByFilters(
    @Args('filters') filters: TaskFilterInput,
  ): Promise<ITask[]> {
    return this.tasksService.filterByStatus(filters);
  }

  @Mutation(() => Task)
  async createTask(
    @Args('createTaskInput') createTaskInput: CreateTaskInput,
  ): Promise<ITask> {
    const {
      user_id,
      notes_encrypted,
      estimate_timer,
      real_timer,
      duration,
      priority_level,
      tags,
      links,
      ...rest
    } = createTaskInput;

    const taskData: Partial<ITask> = {
      ...rest,
      userId: user_id,
      notesEncrypted: notes_encrypted,
      estimateTimer: Number(estimate_timer),
      realTimer: real_timer ? Number(real_timer) : undefined,
      duration: duration ? new Date(String(duration)) : undefined,
      priorityLevel: priority_level,
      tags: tags ? tags.map((t) => ({ name: t })) : [],
      links: links ? links.map((l) => ({ title: l.title, url: l.url })) : [],
      deadline: new Date(createTaskInput.deadline),
      status: rest.status ?? TaskStatus.Todo,
      category: rest.category,
    };
    return this.tasksService.create(taskData);
  }

  @Mutation(() => Boolean)
  async deleteWorkspaceTasks(
    @Args('workspaceId') workspaceId: string,
  ): Promise<boolean> {
    await this.tasksService.deleteWorkspaceTasks(workspaceId);
    return true;
  }

  @Mutation(() => Task)
  async updateTask(
    @Args('updateTaskInput') updateTaskInput: UpdateTaskInput,
  ): Promise<ITask> {
    const {
      id,
      notes_encrypted,
      estimate_timer,
      real_timer,
      duration,
      priority_level,
      tags,
      deadline,
      links,
      ...rest
    } = updateTaskInput;

    const updateData: Partial<ITask> = {};

    // Map fields if they verify
    if (notes_encrypted !== undefined)
      updateData.notesEncrypted = notes_encrypted;
    if (estimate_timer !== undefined)
      updateData.estimateTimer = Number(estimate_timer);
    if (real_timer !== undefined) updateData.realTimer = Number(real_timer);
    if (duration !== undefined)
      updateData.duration = duration ? new Date(String(duration)) : undefined;

    if (priority_level !== undefined) updateData.priorityLevel = priority_level;
    if (tags !== undefined) updateData.tags = tags.map((t) => ({ name: t }));
    if (deadline) updateData.deadline = new Date(deadline);
    if (links !== undefined)
      updateData.links = links.map((l) => ({ title: l.title, url: l.url }));

    Object.assign(updateData, rest);

    return this.tasksService.update(id, updateData);
  }

  @Mutation(() => Boolean) // return boolean for delete? Service returns void.
  async deleteTask(@Args('id') id: string): Promise<boolean> {
    await this.tasksService.delete(id);
    return true;
  }

  @Mutation(() => Task)
  async addSubtask(
    @Args('taskId') taskId: string,
    @Args('subtask') subtask: SubtaskInput,
  ): Promise<ITask> {
    // Adds a subtask to an existing task
    return this.tasksService.addSubtask(taskId, subtask);
  }
}
