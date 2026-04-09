import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Workspace } from '../../workspaces/entities/workspace.entity';

@ObjectType()
export class Folder {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  userId: string;

  @Field({ nullable: true })
  color?: string;

  @Field(() => [Workspace], { nullable: 'items' })
  workspaces?: Workspace[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
