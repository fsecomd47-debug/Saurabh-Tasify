export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6">
      <div className="max-w-md mx-auto space-y-4 pt-8">
        <div className="h-8 bg-[#F2F2F7] rounded-lg w-32 animate-pulse" />
        <div className="h-4 bg-[#F2F2F7] rounded-lg w-48 animate-pulse" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#F2F2F7] rounded-[20px] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
