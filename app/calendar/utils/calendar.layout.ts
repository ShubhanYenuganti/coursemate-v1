import { Goal } from "./goal.types";

/** Calculate overlapping event positions */
export const calculateEventPositions = (goals: Goal[], currentHour: number, currentDate: Date) => {
    if (goals.length === 0) return [];

    console.log(`🔍 Processing ${goals.length} events for overlapping detection in hour ${currentHour}`);

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

        // Calculate top position (minutes from start of hour)
        const topMinutes = (eventStartInHour - hourStart.getTime()) / (1000 * 60);
        const top = (topMinutes / 60) * 100;

        // Calculate height - allow events to extend beyond hour boundaries
        let height: number;
        if (goalStart < hourStart.getTime()) {
            // Event started before this hour - extend from top
            const eventEndInHour = Math.min(goalEnd, hourEnd.getTime());
            const heightMinutes = (eventEndInHour - hourStart.getTime()) / (1000 * 60);
            height = (heightMinutes / 60) * 100;
        } else if (goalEnd > hourEnd.getTime()) {
            // Event ends after this hour - extend to bottom and beyond
            const eventStartInHour = Math.max(goalStart, hourStart.getTime());
            const heightMinutes = (goalEnd - eventStartInHour) / (1000 * 60);
            height = (heightMinutes / 60) * 100;
            // Ensure it extends beyond the hour boundary
            height = Math.max(height, 120); // Extend 20% beyond the hour
        } else {
            // Event is contained within this hour
            const heightMinutes = (eventEndInHour - eventStartInHour) / (1000 * 60);
            height = (heightMinutes / 60) * 100;
        }

        // Show title only if event starts in this hour
        const showTitle = start.getHours() === currentHour;

        console.log(`📅 Event: "${goal.task_title}" (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()})`);
        console.log(`  📏 In hour ${currentHour}: top=${top.toFixed(1)}%, height=${height.toFixed(1)}%, showTitle=${showTitle}`);
        console.log(`  🔍 Event spans: ${goalStart < hourStart.getTime() ? 'starts before' : 'starts in'} this hour, ${goalEnd > hourEnd.getTime() ? 'ends after' : 'ends in'} this hour`);

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

                if (overlaps) {
                    console.log(`  ⚠️  OVERLAPS with "${existingGoal.task_title}" (${existingStart.toLocaleTimeString()} - ${existingEnd.toLocaleTimeString()}) in column ${columnIndex}`);
                }

                return overlaps;
            });

            if (!hasOverlap) {
                console.log(`  ✅ No overlap in column ${columnIndex}`);
                break;
            }
            columnIndex++;
        }

        // Add to the appropriate column
        if (columnIndex >= columns.length) {
            columns.push([]);
            console.log(`  ➕ Created new column ${columnIndex}`);
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

        console.log(`  📍 Positioned in column ${columnIndex} (left: ${adjustedLeft.toFixed(1)}%, width: ${adjustedWidth.toFixed(1)}%, z-index: ${zIndex})`);
        console.log(`  📏 Width adjustment: original=${width.toFixed(1)}%, adjusted=${adjustedWidth.toFixed(1)}%, columnWidth=${columnWidth.toFixed(1)}%, maxWidth=${maxWidth.toFixed(1)}%`);

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

    console.log(`🎯 Final layout: ${columns.length} columns, ${positions.length} positioned events`);
    return positions;
};