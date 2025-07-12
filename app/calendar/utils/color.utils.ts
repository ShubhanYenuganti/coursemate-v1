export const colorForCourse = (courseId: string | null, googleCalendarColor?: string | null) => {
    // If Google Calendar color is available, use it
    if (googleCalendarColor) {
        return googleCalendarColor;
    }

    // Fall back to course-based color system
    const palette = ["#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#22c55e", "#ec4899"];
    if (!courseId) return "#6b7280";                // gray
    const idx = [...courseId].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length;
    return palette[idx];
};