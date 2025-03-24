"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Mic,
  MicOff,
  VideoIcon,
  VideoOff,
  PhoneOff,
  Phone,
} from "lucide-react";
import {
  MediaTrackRegistry,
  CALL_STATUS_KEY,
  ROOM_ID_KEY,
  cleanupMedia,
} from "@/helpers/media-helpers";

type VideoCallProps = {
  roomId: string;
  username: string;
  onCallEnded?: () => void; // Add callback for parent component
};

export function VideoCall({ roomId, username, onCallEnded }: VideoCallProps) {
  // Initialize callActive from sessionStorage if available and room matches
  const [callActive, setCallActive] = useState(() => {
    if (typeof window !== "undefined") {
      const savedStatus = sessionStorage.getItem(CALL_STATUS_KEY);
      const savedRoomId = sessionStorage.getItem(ROOM_ID_KEY);
      return savedStatus === "true" && savedRoomId === roomId;
    }
    return false;
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Update sessionStorage when callActive changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (callActive) {
        sessionStorage.setItem(CALL_STATUS_KEY, "true");
        sessionStorage.setItem(ROOM_ID_KEY, roomId);
      } else {
        sessionStorage.removeItem(CALL_STATUS_KEY);
        sessionStorage.removeItem(ROOM_ID_KEY);
      }
    }
  }, [callActive, roomId]);

  // Handle WebRTC initialization and reconnection
  useEffect(() => {
    let mounted = true;

    const initWebRTC = async () => {
      if (!callActive) return; // Don't initialize if call isn't active

      try {
        // If we're returning to the call and stream doesn't exist
        if (!localStream) {
          // Check if we already have tracks that are still live
          const existingLocalTracks = MediaTrackRegistry.getLocalTracks();
          const liveTracks = existingLocalTracks.filter(
            (track) => track.readyState === "live"
          );

          let stream: MediaStream;

          if (liveTracks.length > 0) {
            // Use existing tracks
            stream = new MediaStream(liveTracks);
          } else {
            // Get new media stream
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });

            // Register new tracks
            stream.getTracks().forEach((track) => {
              MediaTrackRegistry.registerLocalTrack(track);
            });
          }

          if (!mounted) {
            return;
          }

          setLocalStream(stream);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          // Create or recreate peer connection
          setupPeerConnection(stream);
        } else {
          // We already have a stream, just reattach it to the video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }

          // If we already have a remote stream, reattach it too
          if (remoteStream && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        }
        // For demo purposes, we're not implementing the full signaling server
        // In a real app, you would connect to your WebSocket server for signaling
      } catch (error) {
        console.error("Error initializing WebRTC:", error);
        setCallActive(false);
      }
    };

    initWebRTC();

    return () => {
      mounted = false;
    };
  }, [callActive, localStream, remoteStream]);

  // Setup peer connection
  const setupPeerConnection = (stream: MediaStream) => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:your-turn-server.com",
          username: "username",
          credential: "password",
        },
      ],
    };

    // Close any existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addTrack(track, stream);
      }
    });

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      const newRemoteStream = event.streams[0];

      // Register remote tracks
      newRemoteStream.getTracks().forEach((track) => {
        MediaTrackRegistry.registerRemoteTrack(track);
      });

      setRemoteStream(newRemoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = newRemoteStream;
      }
      setIsConnected(true);
    };
  };

  // Component-specific cleanup for handling local references
  const componentCleanup = () => {
    // Clear local references to streams
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear state
    setLocalStream(null);
    setRemoteStream(null);
  };

  const startCall = () => {
    setCallActive(true);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = () => {
    // Run component-specific cleanup
    componentCleanup();

    // Then run global cleanup
    cleanupMedia();

    // Update state
    setIsConnected(false);
    setCallActive(false);

    // Notify parent component if callback provided
    if (onCallEnded) {
      onCallEnded();
    }
  };

  // Before unloading the page, clean up media resources
  useEffect(() => {
    const handleBeforeUnload = () => {
      componentCleanup();
      cleanupMedia();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      componentCleanup();
      cleanupMedia();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If call is not active, show the start call screen
  if (!callActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">
          Ready to join room: {roomId}
        </p>
        <Button onClick={startCall} className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Start Call
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden bg-muted">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
            {username} (You)
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-muted">
          {remoteStream ? (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-sm">
                Remote User
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Waiting for someone to join...
            </div>
          )}
        </Card>
      </div>

      <div className="flex justify-center gap-4 mt-4">
        <Button
          variant={isMuted ? "outline" : "default"}
          size="icon"
          onClick={toggleMute}
        >
          {isMuted ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant={isVideoOff ? "outline" : "default"}
          size="icon"
          onClick={toggleVideo}
        >
          {isVideoOff ? (
            <VideoOff className="h-5 w-5" />
          ) : (
            <VideoIcon className="h-5 w-5" />
          )}
        </Button>

        <Button variant="destructive" size="icon" onClick={endCall}>
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
