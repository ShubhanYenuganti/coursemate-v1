import { Goal } from "./goal.types";
import { isAllDay } from "./goal.progress";

// Generate all days for a month view (including padding days)
export const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(firstDay.getDate() - firstDay.getDay()) // Start from Sunday

    const days = []
    const current = new Date(startDate)

    // Generate 42 days (6 weeks * 7 days) to ensure we cover the entire month
    for (let i = 0; i < 42; i++) {
        days.push(new Date(current))
        current.setDate(current.getDate() + 1)
    }

    return days
}

/** Return "timed" goals whose hour-block **intersects** the supplied hour */
/** Timed goals that START in this exact hour */
export const goalsStartingAtHour = (
    date: Date,
    hour: number,
    getGoalsForDate: (d: Date) => Goal[]
) =>
    getGoalsForDate(date).filter((g) => {
        if (isAllDay(g)) return false;
        // Convert UTC time to local time for comparison
        const start = new Date(g.start_time ?? g.due_date!);
        const end = new Date(g.end_time ?? g.due_date!);

        // Check if the event intersects with this hour
        const hourStart = new Date(date);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(date);
        hourEnd.setHours(hour + 1, 0, 0, 0);

        // Event intersects if it starts before the hour ends AND ends after the hour starts
        return start < hourEnd && end > hourStart;
    });