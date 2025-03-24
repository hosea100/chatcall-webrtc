"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { useWebSocket } from "@/hooks/use-websocket";
import { useAuth } from "@/hooks/use-auth";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  setLocalStream,
  setRemoteStream,
  setPeerConnection,
  setIsConnected,
  setIsMuted,
  setIsVideoOff,
  setIncomingCall,
  setOutgoingCall,
  setCallStatus,
  resetVideoState,
} from "@/lib/redux/slices/videoSlice";
import { MediaTrackRegistry } from "@/helpers/media-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type VideoCallProps = {
  roomId: string;
  username: string;
};

export function VideoCall({ username }: VideoCallProps) {
  const { token } = useAuth();
  const { sendSignalingMessage } = useWebSocket(token);
  const dispatch = useAppDispatch();

  const {
    localStream,
    remoteStream,
    isConnected,
    isMuted,
    isVideoOff,
    incomingCall,
    outgoingCall,
    callStatus,
  } = useAppSelector((state) => state.video);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [targetUser, setTargetUser] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("");

  const roomUsers = useAppSelector((state) => state.users.roomUsers);

  // Initialize WebRTC
  const initializeMedia = useCallback(async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Register tracks in our registry
      stream.getTracks().forEach((track) => {
        MediaTrackRegistry.registerLocalTrack(track);
      });

      dispatch(setLocalStream(stream));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Media Error", {
        description:
          "Could not access camera or microphone. Please check permissions.",
      });
      return null;
    }
  }, [dispatch]);

  // Create peer connection
  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      try {
        // Create peer connection with STUN/TURN servers
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

        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;
        dispatch(setPeerConnection(peerConnection));

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignalingMessage({
              type: "candidate",
              sender: username,
              target: targetUser,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log("Connection state:", peerConnection.connectionState);
          if (peerConnection.connectionState === "connected") {
            dispatch(setIsConnected(true));
            dispatch(setCallStatus("connected"));
          } else if (
            peerConnection.connectionState === "disconnected" ||
            peerConnection.connectionState === "failed" ||
            peerConnection.connectionState === "closed"
          ) {
            dispatch(setIsConnected(false));
            dispatch(
              setCallStatus(
                peerConnection.connectionState === "failed"
                  ? "failed"
                  : "disconnected"
              )
            );
          }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log("Received remote track:", event.track.kind);

          // Register remote tracks
          event.streams[0].getTracks().forEach((track) => {
            MediaTrackRegistry.registerRemoteTrack(track);
          });

          dispatch(setRemoteStream(event.streams[0]));
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        return peerConnection;
      } catch (error) {
        console.error("Error creating peer connection:", error);
        toast.error("Connection Error", {
          description: "Failed to create peer connection.",
        });
        return null;
      }
    },
    [dispatch, sendSignalingMessage, targetUser, username]
  );

  // Handle incoming WebRTC signaling messages
  useEffect(() => {
    if (!token) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSignalingMessage = async (message: any) => {
      console.log("Handling signaling message:", message);

      // Ignore messages from self
      if (message.sender === username) return;

      switch (message.type) {
        case "call-request":
          setCallerName(message.sender);
          setTargetUser(message.sender);
          dispatch(setIncomingCall(true));
          break;

        case "call-accepted":
          if (message.target === username) {
            dispatch(setOutgoingCall(false));
            dispatch(setCallStatus("connecting"));

            // Create offer
            const stream = localStream || (await initializeMedia());
            if (!stream) return;

            const peerConnection = createPeerConnection(stream);
            if (!peerConnection) return;

            try {
              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);

              sendSignalingMessage({
                type: "offer",
                sender: username,
                target: message.sender,
                sdp: offer,
              });
            } catch (error) {
              console.error("Error creating offer:", error);
              toast.error("Call Error", {
                description: "Failed to create call offer.",
              });
            }
          }
          break;

        case "call-rejected":
          if (message.target === username) {
            dispatch(setOutgoingCall(false));
            toast("Call Rejected", {
              description: `${message.sender} rejected your call.`,
            });
          }
          break;

        case "call-ended":
          if (message.target === username || message.target === undefined) {
            endCall();
          }
          break;

        case "offer":
          if (message.target === username) {
            const stream = localStream || (await initializeMedia());
            if (!stream) return;

            const peerConnection =
              peerConnectionRef.current || createPeerConnection(stream);
            if (!peerConnection) return;

            try {
              await peerConnection.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);

              sendSignalingMessage({
                type: "answer",
                sender: username,
                target: message.sender,
                sdp: answer,
              });

              dispatch(setIncomingCall(false));
              dispatch(setCallStatus("connecting"));
            } catch (error) {
              console.error("Error handling offer:", error);
              toast.error("Call Error", {
                description: "Failed to answer call.",
              });
            }
          }
          break;

        case "answer":
          if (message.target === username && peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );
            } catch (error) {
              console.error("Error handling answer:", error);
            }
          }
          break;

        case "candidate":
          if (
            message.target === username &&
            peerConnectionRef.current &&
            peerConnectionRef.current.remoteDescription
          ) {
            try {
              await peerConnectionRef.current.addIceCandidate(
                new RTCIceCandidate(message.candidate)
              );
            } catch (error) {
              console.error("Error adding ICE candidate:", error);
            }
          }
          break;
      }
    };

    // Add event listener for signaling messages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socket = (window as any).socket;
    if (socket) {
      socket.on("webrtc-signaling", handleSignalingMessage);

      return () => {
        socket.off("webrtc-signaling", handleSignalingMessage);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    username,
    dispatch,
    sendSignalingMessage,
    createPeerConnection,
    initializeMedia,
    localStream,
  ]);

  // Set up video refs when streams change
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async (targetUsername: string) => {
    setTargetUser(targetUsername);
    dispatch(setOutgoingCall(true));

    // Send call request
    sendSignalingMessage({
      type: "call-request",
      sender: username,
      target: targetUsername,
    });

    // Initialize media if not already done
    if (!localStream) {
      await initializeMedia();
    }
  };

  const acceptCall = async () => {
    dispatch(setIncomingCall(false));

    // Initialize media if not already done
    if (!localStream) {
      await initializeMedia();
    }

    // Accept the call
    sendSignalingMessage({
      type: "call-accepted",
      sender: username,
      target: callerName,
    });
  };

  const rejectCall = () => {
    dispatch(setIncomingCall(false));

    // Reject the call
    sendSignalingMessage({
      type: "call-rejected",
      sender: username,
      target: callerName,
    });
  };

  const endCall = () => {
    // Send end call signal
    if (isConnected || outgoingCall || incomingCall) {
      sendSignalingMessage({
        type: "call-ended",
        sender: username,
        target: targetUser,
      });
    }

    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Reset state
    dispatch(setLocalStream(null));
    dispatch(setRemoteStream(null));
    dispatch(setPeerConnection(null));
    dispatch(resetVideoState());

    // Clear refs
    peerConnectionRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      dispatch(setIsMuted(!isMuted));
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      dispatch(setIsVideoOff(!isVideoOff));
    }
  };

  // Get online users excluding self
  const onlineUsers = Object.entries(roomUsers)
    .filter(([name, data]) => data.online && name !== username)
    .map(([name]) => name);

  return (
    <>
      <div className="flex flex-col h-full">
        {!isConnected && !outgoingCall && callStatus === "idle" ? (
          <Card className="p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4">Start a Video Call</h2>
            <p className="text-muted-foreground mb-6">
              Select a user to start a video call with:
            </p>

            <div className="flex-1 overflow-auto">
              {onlineUsers.length > 0 ? (
                <div className="space-y-3">
                  {onlineUsers.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                      <Button
                        onClick={() => startCall(name)}
                        size="sm"
                        className="gap-1"
                      >
                        <Phone className="h-4 w-4" />
                        Call
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">
                    No online users available to call
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : (
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
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
                    <VideoOff className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
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
                      {targetUser}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {outgoingCall
                      ? `Calling ${targetUser}...`
                      : "Connecting..."}
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
        )}
      </div>

      {/* Incoming call dialog */}
      <Dialog
        open={incomingCall}
        onOpenChange={(open) => !open && rejectCall()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Incoming Call</DialogTitle>
            <DialogDescription>{callerName} is calling you</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={rejectCall}>
              <PhoneOff className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button onClick={acceptCall}>
              <Phone className="h-4 w-4 mr-2" />
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
