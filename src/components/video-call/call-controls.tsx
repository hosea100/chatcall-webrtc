"use client";

import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
  PhoneOff,
  RefreshCw,
} from "lucide-react";

interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
  callStatus: string;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onRefreshVideo: () => void;
  onReconnect: () => void;
  onEndCall: () => void;
}

export function CallControls({
  isMuted,
  isVideoOff,
  isReconnecting,
  callStatus,
  onToggleMute,
  onToggleVideo,
  onRefreshVideo,
  onReconnect,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="flex justify-center gap-4 mt-4">
      <Button
        variant={isMuted ? "outline" : "default"}
        size="icon"
        onClick={onToggleMute}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </Button>

      <Button
        variant={isVideoOff ? "outline" : "default"}
        size="icon"
        onClick={onToggleVideo}
      >
        {isVideoOff ? (
          <VideoOff className="h-5 w-5" />
        ) : (
          <VideoIcon className="h-5 w-5" />
        )}
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onRefreshVideo}
        title="Refresh Video"
      >
        <RefreshCw className="h-5 w-5" />
      </Button>

      {callStatus === "disconnected" || callStatus === "failed" ? (
        <Button
          variant="outline"
          size="icon"
          onClick={onReconnect}
          disabled={isReconnecting}
        >
          <RefreshCw
            className={`h-5 w-5 ${isReconnecting ? "animate-spin" : ""}`}
          />
        </Button>
      ) : null}

      <Button variant="destructive" size="icon" onClick={onEndCall}>
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
