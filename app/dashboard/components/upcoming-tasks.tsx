export function UpcomingTasks() {
  const tasks = [
    {
      id: 1,
      title: "Physics Quiz",
      details: "10:30 AM - Chapter 4",
      dueDate: "Today",
    },
    {
      id: 2,
      title: "Calculus Assignment",
      details: "Due: End of day",
      dueDate: "Tomorrow",
    },
    {
      id: 3,
      title: "Programming Project",
      details: "Milestone 1",
      dueDate: "Oct 28",
    },
  ]

  return (
    <div className="bg-indigo-700 rounded-lg shadow p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Upcoming Tasks</h2>
        <button className="rounded-full bg-white/20 p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="border-b border-indigo-600 pb-4 last:border-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{task.title}</h3>
                <p className="text-indigo-200 text-sm">{task.details}</p>
              </div>
              <span className="text-xs bg-indigo-600 px-2 py-1 rounded">{task.dueDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
