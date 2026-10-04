"use client"

/** Print / Close buttons for shipment print pages (hidden when printing). */
export function PrintActions() {
  return (
    <div className="no-print fixed top-4 right-4 flex gap-2 z-10">
      <button
        onClick={() => window.print()}
        className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-zinc-800 transition-colors"
      >
        Print
      </button>
      <button
        onClick={() => window.close()}
        className="px-4 py-2 bg-zinc-100 text-zinc-700 text-sm rounded-lg hover:bg-zinc-200 transition-colors"
      >
        Close
      </button>
    </div>
  )
}
