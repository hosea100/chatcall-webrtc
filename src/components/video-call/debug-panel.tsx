"use client";

interface DebugPanelProps {
  debugInfo: string;
}

export function DebugPanel({ debugInfo }: DebugPanelProps) {
  return (
    <div className="mt-4 p-2 bg-muted/50 rounded text-xs font-mono h-20 overflow-auto">
      <div className="whitespace-pre-wrap">{debugInfo}</div>
    </div>
  );
}
