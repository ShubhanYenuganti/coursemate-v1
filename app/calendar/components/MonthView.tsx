import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { colorForCourse } from "../utils/color.utils"
import { getMonthDays } from "../utils/calendar.utils"
import { startOfToday } from "../utils/date.utils"

export const MonthView = ({ currentDate, setCurrentDate, getGoalsForDate, handleGoalClick }: any) => (
    <>
      <div className="flex flex-col border-b border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
  
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
                )
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
  
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
              This Month
            </Button>
  
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentDate(
                  new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
                )
              }
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
  
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {["Su", "M", "Tu", "W", "Th", "F", "Sa"].map((d) => (
            <div key={d} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
              {d}
            </div>
          ))}
        </div>
      </div>
  
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 gap-px bg-gray-200 h-full">
          {getMonthDays(currentDate).map((d: Date) => {
            const inMonth = d.getMonth() === currentDate.getMonth();
            const isToday = d.toDateString() === startOfToday().toDateString();
            const evs = getGoalsForDate(d);
  
            return (
              <div
                key={d.toISOString()}
                className={`bg-white p-2 min-h-[110px] ${!inMonth ? "bg-gray-50 text-gray-400" : ""}`}
              >
                <div
                  className={`text-sm font-medium mb-2 ${isToday
                    ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                    : ""
                    }`}
                >
                  {d.getDate()}
                </div>
  
                {evs.slice(0, 3).map((g: any) => (
                  <div
                    key={g.goal_id}
                    className="text-xs p-1 rounded text-white font-medium truncate cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: colorForCourse(g.course_id, g.google_calendar_color) }}
                    onClick={(e) => handleGoalClick(g, e)}
                  >
                    {g.task_title ?? "(untitled)"}
                  </div>
                ))}
  
                {evs.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium">
                    +{evs.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );