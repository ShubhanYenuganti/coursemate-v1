interface LeaveReviewProps {
  rating: number;
  setRating: (val: number) => void;
  text: string;
  setText: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  showForm: boolean;
  setShowForm: (val: boolean) => void;
}

const LeaveReview: React.FC<LeaveReviewProps> = ({
  rating,
  setRating,
  text,
  setText,
  isSubmitting,
  onSubmit,
  showForm,
  setShowForm,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto">
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition"
      >
        {showForm ? "Cancel Review" : "Leave a Review"}
      </button>

      {showForm && (
        <form
          onSubmit={onSubmit}
          className="space-y-4 border rounded-lg p-4 bg-white shadow-sm"
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              {rating.toFixed(1)} / 5
            </span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={rating}
              onChange={(e) => setRating(parseFloat(e.target.value))}
              className="w-full max-w-md accent-purple-600"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Comment <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Leave your thoughts (optional)..."
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      )}
    </div>
  );
};

export default LeaveReview;
