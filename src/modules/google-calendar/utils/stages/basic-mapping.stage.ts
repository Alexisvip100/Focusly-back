import {
  GoogleEvent,
  ProcessedGoogleTask,
} from '../../interfaces/google-calendar.interfaces';

const mapGoogleColorToPriority = (colorId?: string): number => {
  if (!colorId) return 1; // Default to Low priority

  const priorityMap: Record<string, number> = {
    // High Priority (Level 3) - Reds, Pinks, Oranges, Bold Purples
    '11': 3, // Tomato
    '4': 3, // Flamingo
    '6': 3, // Tangerine
    '3': 3, // Grape

    // Medium Priority (Level 2) - Yellows, Blues, Bright Greens
    '5': 2, // Banana
    '9': 2, // Blueberry
    '7': 2, // Peacock
    '2': 2, // Sage

    // Low Priority (Level 1) - Lavenders, Dark Greens, Greys
    '1': 1, // Lavender
    '10': 1, // Basil
    '8': 1, // Graphite
  };

  return priorityMap[colorId] || 1;
};

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
    status: 'Scheduled',
    priority_level: mapGoogleColorToPriority(event.colorId),
    subtasks: [],
    tags: [],
    links: [],
    estimate_timer: Math.round((deadline.getTime() - start.getTime()) / 60000),
    task_type: 'GoogleTask',
    is_all_day: isAllDay,
    location: event.location,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};
