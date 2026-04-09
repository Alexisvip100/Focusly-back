import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksResolver } from './tasks.resolver';
import { TagsModule } from '../tags/tags.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [TagsModule, forwardRef(() => WorkspacesModule)],
  providers: [TasksService, TasksResolver],
  exports: [TasksService],
})
export class TasksModule {}
