export function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: "note",
      description: "Added new notes for Calculus 101",
      time: "10 min ago",
      icon: "📝",
    },
    {
      id: 2,
      type: "quiz",
      description: "Completed Chapter 3 Quiz in Physics",
      time: "1 hour ago",
      icon: "✓",
    },
    {
      id: 3,
      type: "chat",
      description: "AI Chat: Asked about Data Structures",
      time: "3 hours ago",
      icon: "💬",
    },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Recent Activity</h2>
        <a href="#" className="text-blue-500 text-sm hover:underline">
          See All
        </a>
      </div>

      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3 py-2">
            <div className="bg-gray-100 p-2 rounded">
              <span>{activity.icon}</span>
            </div>
            <div className="flex-1">
              <p className="text-gray-800">{activity.description}</p>
              <p className="text-gray-500 text-sm">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
