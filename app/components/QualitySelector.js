export default function QualitySelector({ formats, selected, onSelect }) {
  if (!formats || formats.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg mb-2 text-black">Quality Options</h3>
      {formats.map((format) => (
        <label
          key={format.id}
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
            selected === format.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
          }`}
        >
          <input
            type="radio"
            name="format"
            checked={selected === format.id}
            onChange={() => onSelect(format.id)}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />

          <div>
            <div className="font-medium text-black">
              {format.quality}
            </div>

            <div className="text-sm text-gray-500">
              {format.extension.toUpperCase()}
            </div>
          </div>
        </label>
      ))}
    </div>
  );
}
