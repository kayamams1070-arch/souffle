import { addDays } from './dates';

export type QuitChoice = 'now' | 'tomorrow' | 'in3' | 'in7' | 'in14' | 'past';

export function quitDateForChoice(choice: QuitChoice, pastDays: number, now = new Date()): string {
  switch (choice) {
    case 'now':
      return now.toISOString();
    case 'tomorrow': {
      const d = addDays(now, 1);
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }
    case 'in3': {
      const d = addDays(now, 3);
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }
    case 'in7': {
      const d = addDays(now, 7);
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }
    case 'in14': {
      const d = addDays(now, 14);
      d.setHours(8, 0, 0, 0);
      return d.toISOString();
    }
    case 'past': {
      const d = addDays(now, -pastDays);
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
  }
}
