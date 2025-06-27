import { Sidebar } from '../dashboard/components/sidebar';
import  { CalendarScheduler } from './calendar-scheduler';

export default function CalendarPage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <CalendarScheduler />
      </div>
    </div>
  );
} 