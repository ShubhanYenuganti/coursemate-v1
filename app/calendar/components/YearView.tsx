import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfToday } from "../utils/date.utils";

export const YearView = ({ currentDate, setCurrentDate }: any) => (
    <>
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{currentDate.getFullYear()}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(startOfToday())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
  
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {Array.from({ length: 12 }, (_, m) => {
            const monthDate = new Date(currentDate.getFullYear(), m, 1);
            const monthName = monthDate.toLocaleDateString("en-US", { month: "long" });
            const daysInMonth = new Date(currentDate.getFullYear(), m + 1, 0).getDate();
            const firstDow = monthDate.getDay();
            return (
              <div
                key={m}
                className="border border-gray-200 rounded-lg p-4 hover:shadow cursor-pointer"
                onClick={() => {
                  setCurrentDate(new Date(currentDate.getFullYear(), m, 1));
                  // setCurrentView("month"); // You'll need to pass this as a prop
                }}
              >
                <h3 className="text-lg font-semibold text-center mb-3">{monthName}</h3>
                <div className="grid grid-cols-7 text-xs gap-1">
                  {["Su", "M", "Tu", "W", "Th", "F", "Sa"].map((d) => (
                    <div key={d} className="text-center text-gray-500">{d}</div>
                  ))}
                  {Array.from({ length: firstDow }, (_, i) => (
                    <div key={i} className="h-5"></div>
                  ))}
                  {Array.from({ length: daysInMonth }, (_, dayIdx) => {
                    const d = dayIdx + 1;
                    const full = new Date(currentDate.getFullYear(), m, d);
                    const isToday =
                      full.toDateString() === startOfToday().toDateString() &&
                      full.getFullYear() === startOfToday().getFullYear();
                    return (
                      <div
                        key={d}
                        className={`h-5 flex items-center justify-center ${isToday ? "bg-blue-600 text-white rounded-full" : "text-gray-900 hover:bg-gray-100 rounded"}`}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );