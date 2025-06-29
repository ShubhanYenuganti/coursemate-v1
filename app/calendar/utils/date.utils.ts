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
        { hour: "2-digit", minute: withMinutes ? "2-digit" : undefined }
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