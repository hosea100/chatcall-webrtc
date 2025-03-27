"use client";

import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { VideoOff } from "lucide-react";

interface VideoStreamProps {
  stream: MediaStream | null;
  username: string;
  isLocal?: boolean;
  isVideoOff?: boolean;
  onClick?: () => void;
  showPlayButton?: boolean;
}

export function VideoStream({
  stream,
  username,
  isLocal = false,
  isVideoOff = false,
  onClick,
  showPlayButton = false,
}: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  console.log("[WebRTC] video stream:", stream, {
    username,
    isLocal,
    isVideoOff,
  });
  console.log("Video tracks:", stream?.getVideoTracks());

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <Card
      className="relative overflow-hidden bg-muted cursor-pointer h-full"
      onClick={onClick}
    >
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
            {username} {isLocal && "(You)"}
          </div>
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {showPlayButton && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center">
                <VideoOff className="h-16 w-16 text-white mb-2" />
                <span className="text-white text-center">
                  Click to play video
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          {isLocal ? "Camera not available" : "Connecting..."}
        </div>
      )}
    </Card>
  );
}
