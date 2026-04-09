import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('google-calendar')
@UseGuards(JwtAuthGuard)
export class GoogleCalendarController {
  constructor(private readonly googleCalendarService: GoogleCalendarService) {}

  @Get('events')
  async getEvents(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    return (await this.googleCalendarService.getEvents(
      userId,
    )) as Promise<unknown>;
  }

  @Post('events')
  async createEvent(@Request() req: any, @Body() event: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    return (await this.googleCalendarService.createEvent(
      userId,
      event,
    )) as Promise<unknown>;
  }

  @Patch('events/:id')
  async patchEvent(
    @Request() req: any,
    @Param('id') eventId: string,
    @Body() event: any,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    return (await this.googleCalendarService.patchEvent(
      userId,
      eventId,
      event,
    )) as Promise<unknown>;
  }

  @Delete('events/:id')
  async removeEvent(@Request() req: any, @Param('id') eventId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    await this.googleCalendarService.deleteEvent(userId, eventId);
    return { success: true };
  }
}
