import { Goal } from "./goal.types";

/** Calculate overlapping event positions */
export const calculateEventPositions = (goals: Goal[], currentHour: number, currentDate: Date) => {
    if (goals.length === 0) return [];

    // Sort goals by start time
    const sortedGoals = [...goals].sort((a, b) => {
        const aStart = new Date(a.start_time ?? a.due_date!);
        const bStart = new Date(b.start_time ?? b.due_date!);
        return aStart.getTime() - bStart.getTime();
    });

    const positions: Array<{
        goal: Goal;
        left: number;
        width: number;
        top: number;
        height: number;
        zIndex: number;
        showTitle: boolean;
    }> = [];

    const columns: Goal[][] = [];

    for (const goal of sortedGoals) {
        const start = new Date(goal.start_time ?? goal.due_date!);
        const end = new Date(goal.end_time ?? goal.due_date!);
        const goalStart = start.getTime();
        const goalEnd = end.getTime();

        // Calculate hour boundaries
        const hourStart = new Date(currentDate);
        hourStart.setHours(currentHour, 0, 0, 0);
        const hourEnd = new Date(currentDate);
        hourEnd.setHours(currentHour + 1, 0, 0, 0);

        // Calculate position relative to this hour
        const eventStartInHour = Math.max(goalStart, hourStart.getTime());
        const eventEndInHour = Math.min(goalEnd, hourEnd.getTime());

        // Calculate top position (minutes from start of hour) with small gap
        const topMinutes = (eventStartInHour - hourStart.getTime()) / (1000 * 60);
        const top = (topMinutes / 60) * 100 + 2; // Add 2% gap at top

        // Calculate height - allow events to extend beyond hour boundaries
        let height: number;
        if (goalStart < hourStart.getTime()) {
            // Event started before this hour - extend from top
            const eventEndInHour = Math.min(goalEnd, hourEnd.getTime());
            const heightMinutes = (eventEndInHour - hourStart.getTime()) / (1000 * 60);
            height = (heightMinutes / 60) * 100 - 4; // Subtract 4% for gaps (2% top + 2% bottom)
        } else if (goalEnd > hourEnd.getTime()) {
            // Event ends after this hour - extend to bottom and beyond
            const eventStartInHour = Math.max(goalStart, hourStart.getTime());
            const heightMinutes = (goalEnd - eventStartInHour) / (1000 * 60);
            height = (heightMinutes / 60) * 100 - 4; // Subtract 4% for gaps
            // Ensure it extends beyond the hour boundary
            height = Math.max(height, 116); // Extend 16% beyond the hour (120% - 4% gaps)
        } else {
            // Event is contained within this hour
            const heightMinutes = (eventEndInHour - eventStartInHour) / (1000 * 60);
            height = (heightMinutes / 60) * 100 - 4; // Subtract 4% for gaps
        }

        // Show title only if event starts in this hour
        const showTitle = start.getHours() === currentHour;

        // Find the first column where this goal doesn't overlap
        let columnIndex = 0;
        while (columnIndex < columns.length) {
            const column = columns[columnIndex];
            const hasOverlap = column.some(existingGoal => {
                const existingStart = new Date(existingGoal.start_time ?? existingGoal.due_date!);
                const existingEnd = new Date(existingGoal.end_time ?? existingGoal.due_date!);
                const existingStartTime = existingStart.getTime();
                const existingEndTime = existingEnd.getTime();

                const overlaps = !(goalEnd <= existingStartTime || goalStart >= existingEndTime);


                return overlaps;
            });

            if (!hasOverlap) {
                break;
            }
            columnIndex++;
        }

        // Add to the appropriate column
        if (columnIndex >= columns.length) {
            columns.push([]);
        }
        columns[columnIndex].push(goal);

        // Calculate position
        const totalColumns = Math.max(columns.length, 1);
        const left = (columnIndex / totalColumns) * 100;
        const width = (1 / totalColumns) * 100;

        // Increase width for overlapped events but ensure they stay within column boundaries
        const columnWidth = 100 / totalColumns;
        const maxWidth = columnWidth * 0.9; // Use 90% of column width to leave some margin
        const adjustedWidth = Math.min(width * 1.2, maxWidth); // Make events 20% wider, but respect column boundaries
        const adjustedLeft = left + (columnWidth - adjustedWidth) / 2; // Center within the column

        // Shorter events get higher z-index (appear on top)
        const duration = goalEnd - goalStart;
        const zIndex = Math.max(1000 - Math.floor(duration / (1000 * 60)), 1); // Inverse of duration

        positions.push({
            goal,
            left: adjustedLeft,
            width: adjustedWidth,
            top,
            height,
            zIndex,
            showTitle
        });
    }

    return positions;
};