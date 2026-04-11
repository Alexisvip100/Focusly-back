import {
  GoogleEvent,
  ProcessedGoogleTask,
} from '../../interfaces/google-calendar.interfaces';
import { ITask } from '../../../tasks/interfaces/task.interface';

export const BasicMappingStage = (event: GoogleEvent): ProcessedGoogleTask => {
  const isAllDay = !!event.start?.date;
  const start = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : event.start?.date
      ? new Date(event.start.date)
      : new Date();

  const deadline = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : event.end?.date
      ? new Date(event.end.date)
      : new Date(start.getTime() + 30 * 60000);

  return {
    id: event.id || '',
    google_event_id: event.id,
    title: event.summary || 'Sin título',
    notes_encrypted: event.description || '',
    deadline: deadline.toISOString(),
    estimated_start_date: start.toISOString(),
    estimated_end_date: deadline.toISOString(),
    status: 'Scheduled' as ITask['status'],
    priority_level: 3,
    subtasks: [],
    tags: [],
    links: [],
    estimate_timer: Math.round((deadline.getTime() - start.getTime()) / 60000),
    is_all_day: isAllDay,
    location: event.location,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};
