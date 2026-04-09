import {
  GoogleEvent,
  ProcessedGoogleTask,
} from '../../interfaces/google-calendar.interfaces';

export const ParticipantProcessorStage = (
  event: GoogleEvent,
  task: ProcessedGoogleTask,
): ProcessedGoogleTask => {
  if (event.attendees) {
    task.participants = event.attendees.map(
      (attendee: { email: string; responseStatus: any }) => {
        const email = attendee.email || '';
        return {
          email,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          responseStatus: attendee.responseStatus,
          // Using a cleaner avatar service with defaults
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=random&color=fff&size=128`,
        };
      },
    );
  }

  task.organizer_email = event.organizer?.email;

  return task;
};
