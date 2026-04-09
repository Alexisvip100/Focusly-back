import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FocusSessionsService } from './focus-sessions.service';
import { CreateFocusSessionDto } from './dto/create-focus-session.dto';
import { IFocusSession } from './interfaces/focus-session.interface';

@Controller('focus-sessions')
export class FocusSessionsController {
  constructor(private readonly focusSessionsService: FocusSessionsService) {}

  @Post()
  async create(@Body() createDto: CreateFocusSessionDto): Promise<string> {
    return this.focusSessionsService.create(createDto as any);
  }

  @Get()
  async findAll(): Promise<IFocusSession[]> {
    return this.focusSessionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<IFocusSession> {
    return this.focusSessionsService.findOne(id);
  }
}
