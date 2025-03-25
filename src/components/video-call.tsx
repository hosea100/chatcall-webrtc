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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function VideoCall({ roomId, username }: VideoCallProps) {
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
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const [targetUser, setTargetUser] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("");

  const roomUsers = useAppSelector((state) => state.users.roomUsers);

  // Initialize WebRTC
  const initializeMedia = useCallback(async () => {
    try {
      console.log("Initializing media...");
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Media stream obtained:", stream.id);
      console.log("Video tracks:", stream.getVideoTracks().length);
      console.log("Audio tracks:", stream.getAudioTracks().length);

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

  // Process queued ICE candidates
  const processIceCandidates = useCallback(() => {
    if (
      peerConnectionRef.current &&
      peerConnectionRef.current.remoteDescription &&
      iceCandidatesQueue.current.length > 0
    ) {
      console.log(
        `Processing ${iceCandidatesQueue.current.length} queued ICE candidates`
      );

      iceCandidatesQueue.current.forEach(async (candidate) => {
        try {
          await peerConnectionRef.current?.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          console.log("Added queued ICE candidate");
        } catch (err) {
          console.error("Error adding queued ICE candidate:", err);
        }
      });

      iceCandidatesQueue.current = [];
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      try {
        console.log("Creating peer connection...");
        // Create peer connection with STUN/TURN servers
        const configuration = {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
            {
              urls: "turn:openrelay.metered.ca:80",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
            {
              urls: "turn:openrelay.metered.ca:443?transport=tcp",
              username: "openrelayproject",
              credential: "openrelayproject",
            },
          ],
          iceCandidatePoolSize: 10,
        };

        const peerConnection = new RTCPeerConnection(configuration);
        peerConnectionRef.current = peerConnection;
        dispatch(setPeerConnection(peerConnection));

        console.log("Adding tracks to peer connection...");
        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log(`Adding ${track.kind} track to peer connection`);
          peerConnection.addTrack(track, stream);
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            console.log("ICE candidate generated:", event.candidate);
            sendSignalingMessage({
              type: "candidate",
              sender: username,
              target: targetUser,
              candidate: event.candidate.toJSON(),
            });
          } else {
            console.log("ICE gathering complete");
          }
        };

        // Log ICE gathering state changes
        peerConnection.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", peerConnection.iceGatheringState);
        };

        // Log ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          console.log(
            "ICE connection state:",
            peerConnection.iceConnectionState
          );

          if (peerConnection.iceConnectionState === "failed") {
            console.log("ICE connection failed, restarting ICE");
            peerConnection.restartIce();
          }

          if (
            peerConnection.iceConnectionState === "connected" ||
            peerConnection.iceConnectionState === "completed"
          ) {
            toast.success("Media connection established");
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log("Connection state:", peerConnection.connectionState);
          if (peerConnection.connectionState === "connected") {
            dispatch(setIsConnected(true));
            dispatch(setCallStatus("connected"));
            toast.success("Call connected");
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
            if (peerConnection.connectionState === "failed") {
              toast.error("Call failed");
            }
          }
        };

        // Handle negotiation needed
        peerConnection.onnegotiationneeded = async () => {
          console.log("Negotiation needed");
          if (peerConnection.signalingState === "stable") {
            try {
              console.log("Creating offer due to negotiation needed");
              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });
              await peerConnection.setLocalDescription(offer);

              sendSignalingMessage({
                type: "offer",
                sender: username,
                target: targetUser,
                sdp: peerConnection.localDescription ?? undefined,
              });
            } catch (err) {
              console.error("Error during negotiation:", err);
            }
          }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          console.log("Received remote track:", event.track.kind);
          console.log("Remote streams:", event.streams.length);

          if (event.streams && event.streams[0]) {
            console.log("Setting remote stream");

            // Register remote tracks
            event.streams[0].getTracks().forEach((track) => {
              MediaTrackRegistry.registerRemoteTrack(track);
              console.log(`Added remote ${track.kind} track`);
            });

            // Force a UI update by creating a new MediaStream with the same tracks
            const newStream = new MediaStream(event.streams[0].getTracks());
            dispatch(setRemoteStream(newStream));

            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = newStream;

              // Don't try to play immediately - let the 'loadedmetadata' event trigger playback
              remoteVideoRef.current.onloadedmetadata = () => {
                console.log("Remote video metadata loaded, attempting to play");
                // Use a timeout to ensure the browser is ready
                setTimeout(() => {
                  const playPromise = remoteVideoRef.current?.play();
                  if (playPromise) {
                    playPromise.catch((err) => {
                      console.warn(
                        "Initial play failed, will retry on user interaction:",
                        err
                      );
                      // We'll rely on autoplay or user interaction to start the video
                    });
                  }
                }, 100);
              };
            }
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
          console.log("Received call request from:", message.sender);
          setCallerName(message.sender);
          setTargetUser(message.sender);
          dispatch(setIncomingCall(true));
          break;

        case "call-accepted":
          console.log("Call accepted by:", message.sender);
          if (message.target === username) {
            dispatch(setOutgoingCall(false));
            dispatch(setCallStatus("connecting"));
            toast.success("Call accepted");

            // Create offer
            const stream = localStream || (await initializeMedia());
            if (!stream) {
              toast.error("Failed to get local media stream");
              return;
            }

            const peerConnection = createPeerConnection(stream);
            if (!peerConnection) {
              toast.error("Failed to create peer connection");
              return;
            }

            try {
              console.log("Creating offer...");
              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
              });
              console.log("Offer created:", offer);

              await peerConnection.setLocalDescription(offer);
              console.log("Local description set");

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
            toast("Call Ended", {
              description: `${message.sender} ended the call.`,
            });
          }
          break;

        case "offer":
          console.log("Received offer from:", message.sender);
          if (message.target === username) {
            const stream = localStream || (await initializeMedia());
            if (!stream) {
              toast.error("Failed to get local media stream");
              return;
            }

            const peerConnection =
              peerConnectionRef.current || createPeerConnection(stream);
            if (!peerConnection) {
              toast.error("Failed to create peer connection");
              return;
            }

            try {
              console.log("Setting remote description (offer)");
              await peerConnection.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );

              // Process any queued ICE candidates
              processIceCandidates();

              console.log("Creating answer...");
              const answer = await peerConnection.createAnswer();
              console.log("Answer created:", answer);

              await peerConnection.setLocalDescription(answer);
              console.log("Local description set (answer)");

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
          console.log("Received answer from:", message.sender);
          if (message.target === username && peerConnectionRef.current) {
            try {
              console.log("Setting remote description (answer)");
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );
              console.log("Remote description set successfully");

              // Process any queued ICE candidates
              processIceCandidates();
            } catch (error) {
              console.error("Error handling answer:", error);
              toast.error("Call Error", {
                description: "Failed to establish connection.",
              });
            }
          }
          break;

        case "candidate":
          console.log("Received ICE candidate from:", message.sender);
          if (message.target === username && peerConnectionRef.current) {
            try {
              // If we have a remote description, add the candidate immediately
              if (peerConnectionRef.current.remoteDescription) {
                console.log("Adding ICE candidate");
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(message.candidate)
                );
                console.log("ICE candidate added successfully");
              } else {
                // Otherwise, queue the candidate for later
                console.log("Queueing ICE candidate for later");
                iceCandidatesQueue.current.push(message.candidate);
              }
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
    processIceCandidates,
  ]);

  // Set up video refs when streams change
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Setting local video source");
      localVideoRef.current.srcObject = localStream;
    }

    if (remoteStream && remoteVideoRef.current) {
      console.log("Setting remote video source");
      remoteVideoRef.current.srcObject = remoteStream;

      // Set up event handlers for the remote video
      const remoteVideo = remoteVideoRef.current;

      const handleCanPlay = () => {
        console.log("Remote video can play now");
        try {
          remoteVideo.play().catch((err) => {
            console.warn("Remote video play failed on canplay event:", err);
            // Add a visible play button or indicator here if needed
          });
        } catch (err) {
          console.warn("Error in canplay handler:", err);
        }
      };

      remoteVideo.addEventListener("canplay", handleCanPlay);

      return () => {
        remoteVideo.removeEventListener("canplay", handleCanPlay);
      };
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
    console.log("Starting call to:", targetUsername);
    setTargetUser(targetUsername);
    dispatch(setOutgoingCall(true));

    // Initialize media if not already done
    if (!localStream) {
      const stream = await initializeMedia();
      if (!stream) {
        dispatch(setOutgoingCall(false));
        return;
      }
    }

    // Send call request
    sendSignalingMessage({
      type: "call-request",
      sender: username,
      target: targetUsername,
    });

    toast("Calling...", {
      description: `Calling ${targetUsername}`,
    });
  };

  const acceptCall = async () => {
    console.log("Accepting call from:", callerName);
    dispatch(setIncomingCall(false));

    // Initialize media if not already done
    if (!localStream) {
      const stream = await initializeMedia();
      if (!stream) {
        toast.error("Failed to access camera/microphone");
        return;
      }
    }

    // Accept the call
    sendSignalingMessage({
      type: "call-accepted",
      sender: username,
      target: callerName,
    });

    toast("Call Accepted", {
      description: `You accepted ${callerName}'s call`,
    });
  };

  const rejectCall = () => {
    console.log("Rejecting call from:", callerName);
    dispatch(setIncomingCall(false));

    // Reject the call
    sendSignalingMessage({
      type: "call-rejected",
      sender: username,
      target: callerName,
    });

    toast("Call Rejected", {
      description: `You rejected ${callerName}'s call`,
    });
  };

  const endCall = () => {
    console.log("Ending call");
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
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
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

    toast("Call Ended");
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      dispatch(setIsMuted(!isMuted));
      toast(isMuted ? "Microphone Unmuted" : "Microphone Muted");
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      dispatch(setIsVideoOff(!isVideoOff));
      toast(isVideoOff ? "Camera Turned On" : "Camera Turned Off");
    }
  };

  // Get online users excluding self
  const onlineUsers = Object.entries(roomUsers)
    .filter(([name, data]) => data.online && name !== username)
    .map(([name]) => name);

  const forcePlayVideos = () => {
    console.log("User interaction - attempting to play videos");

    if (localVideoRef.current && localVideoRef.current.paused) {
      localVideoRef.current
        .play()
        .catch((err) => console.warn("Could not play local video:", err));
    }

    if (remoteVideoRef.current && remoteVideoRef.current.paused) {
      remoteVideoRef.current
        .play()
        .catch((err) => console.warn("Could not play remote video:", err));
    }
  };

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

              <Card
                className="relative overflow-hidden bg-muted"
                onClick={forcePlayVideos}
              >
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
                    {remoteVideoRef.current?.paused && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer">
                        <VideoIcon className="h-16 w-16 text-white" />
                      </div>
                    )}
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
