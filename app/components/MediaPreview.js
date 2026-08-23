export default function MediaPreview({ media }) {
  if (!media) {
    return null;
  }

  return (
    <div className="rounded-xl border p-4 bg-white text-black shadow-sm">
      {media.thumbnail && (
        <img
          src={media.thumbnail}
          alt={media.title}
          className="mb-4 max-h-80 w-full object-contain rounded-lg bg-gray-100"
        />
      )}

      <h2 className="text-xl font-semibold mb-1">
        {media.title}
      </h2>

      <p className="text-sm text-gray-500 capitalize">
        Platform: {media.platform}
      </p>

      <p className="text-sm text-gray-500 capitalize">
        Type: {media.type}
      </p>
    </div>
  );
}
