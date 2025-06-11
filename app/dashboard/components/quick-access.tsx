export function QuickAccess() {
  const actions = [
    { id: 1, name: "New Note", icon: "📝", color: "bg-indigo-600" },
    { id: 2, name: "Upload File", icon: "📤", color: "bg-indigo-600" },
    { id: 3, name: "View Calendar", icon: "📅", color: "bg-indigo-600" },
    { id: 4, name: "Start AI Chat", icon: "💬", color: "bg-indigo-600" },
  ]

  return (
    <div className="bg-indigo-700 rounded-lg shadow p-6 text-white">
      <h2 className="text-lg font-bold mb-4">Quick Access</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            className="flex flex-col items-center justify-center p-3 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            <span className="text-xl mb-1">{action.icon}</span>
            <span className="text-xs whitespace-nowrap">{action.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
