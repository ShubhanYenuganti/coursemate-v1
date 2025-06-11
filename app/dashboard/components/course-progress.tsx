export function CourseProgress() {
  const courses = [
    {
      id: 1,
      name: "Calculus 101",
      progress: 75,
      color: "red",
      icon: "📊",
    },
    {
      id: 2,
      name: "Physics Fundamentals",
      progress: 40,
      color: "blue",
      icon: "🔬",
    },
    {
      id: 3,
      name: "Intro to Programming",
      progress: 90,
      color: "green",
      icon: "💻",
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Course Progress</h2>
        <a href="#" className="text-blue-500 text-sm hover:underline">
          View All
        </a>
      </div>

      <div className="space-y-6">
        {courses.map((course) => (
          <div key={course.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span
                  className={`bg-${course.color}-100 text-${course.color}-600 p-2 rounded mr-3`}
                >
                  {course.icon}
                </span>
                <span className="font-medium">{course.name}</span>
              </div>
              <span className="text-gray-600">{course.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`bg-${course.color}-500 h-2 rounded-full`}
                style={{ width: `${course.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
