export function LoadingSpinner() {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[#33a8da] rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }