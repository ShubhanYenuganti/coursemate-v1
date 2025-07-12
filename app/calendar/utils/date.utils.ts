export const startOfToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

// Return Sunday-based week for a reference date
export const getWeekDates = (ref: Date) => {
    const start = new Date(ref)
    start.setDate(ref.getDate() - ref.getDay())
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        return d
    })
}

export const formatHourLabel = (h: number, withMinutes = false) => {
    const date = new Date()
    date.setHours(h, 0, 0, 0)
    return date.toLocaleTimeString("en-US",
        { hour: "numeric", minute: withMinutes ? "2-digit" : undefined, hour12: true }
    )
}

export function getLocalDateKey(date: Date): string {
    return (
        date.getFullYear() +
        "-" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(date.getDate()).padStart(2, "0")
    );
}

// Returns a date key (YYYY-MM-DD) from a date string, ignoring time and timezone
export function getDateKeyFromDateString(dateString: string): string {
  // Handles both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm:ssZ' formats
  return dateString.split('T')[0];
}