import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class GoogleCalendarService {
  constructor(private readonly authService: AuthService) {}

  async getEvents(userId: string) {
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);
    const params = new URLSearchParams({
      timeMin: new Date(
        new Date().setFullYear(new Date().getFullYear() - 1),
      ).toISOString(),
      maxResults: '2500',
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    if (!response.ok)
      throw new InternalServerErrorException('Failed to fetch from Google');
    return response.json() as Promise<unknown>;
  }

  async createEvent(userId: string, event: any) {
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );
    if (!response.ok)
      throw new InternalServerErrorException('Failed to create Google event');
    return response.json() as Promise<unknown>;
  }

  async patchEvent(userId: string, eventId: string, event: any) {
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?conferenceDataVersion=1`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );
    if (!response.ok)
      throw new InternalServerErrorException('Failed to patch Google event');
    return response.json() as Promise<unknown>;
  }

  async deleteEvent(userId: string, eventId: string) {
    const { access_token } =
      await this.authService.refreshGoogleAccessToken(userId);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );
    if (!response.ok && response.status !== 404) {
      throw new InternalServerErrorException('Failed to delete Google event');
    }
  }
}
