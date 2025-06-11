export function SummaryCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="bg-purple-500 rounded-lg p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-bold">5</h3>
            <p className="text-sm opacity-80">Currently enrolled</p>
          </div>
          <div className="rounded-full bg-white/20 p-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold mt-2">Active Courses</h2>
      </div>

      <div className="bg-blue-500 rounded-lg p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-bold">25.5 hrs</h3>
            <p className="text-sm opacity-80">This week</p>
          </div>
          <div className="rounded-full bg-white/20 p-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold mt-2">Study Hours</h2>
      </div>

      <div className="bg-green-500 rounded-lg p-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-bold">18</h3>
            <p className="text-sm opacity-80">Out of 23 tasks</p>
          </div>
          <div className="rounded-full bg-white/20 p-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold mt-2">Tasks Completed</h2>
      </div>
    </div>
  )
}
