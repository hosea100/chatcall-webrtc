"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { toast } from "sonner";
import { VideoStream } from "./video-call/video-stream";
import { CallControls } from "./video-call/call-controls";
import { CallUserList } from "./video-call/user-list";
import { IncomingCallDialog } from "./video-call/incoming-call-dialog";
import { DebugPanel } from "./video-call/debug-panel";

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
  const isCallInitiator = useRef<boolean>(false);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const hasReceivedRemoteStream = useRef<boolean>(false);
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoPlaybackAttemptsRef = useRef<number>(0);

  const [targetUser, setTargetUser] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("");
  const [showPlayButton, setShowPlayButton] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [videoKey, setVideoKey] = useState<number>(0);

  const roomUsers = useAppSelector((state) => state.users.roomUsers);

  // Debug function to log important information
  const logDebug = useCallback((message: string) => {
    console.log(`[WebRTC Debug] ${message}`);
    setDebugInfo((prev) => `${message}\n${prev}`.slice(0, 500));
  }, []);

  // Initialize WebRTC
  const initializeMedia = useCallback(async () => {
    try {
      logDebug("Initializing media...");
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      logDebug(`Media stream obtained: ${stream.id}`);
      logDebug(
        `Video tracks: ${stream.getVideoTracks().length}, Audio tracks: ${
          stream.getAudioTracks().length
        }`
      );

      // Ensure tracks are enabled
      stream.getTracks().forEach((track) => {
        track.enabled = true;
        logDebug(`Track ${track.id} (${track.kind}) enabled: ${track.enabled}`);
      });

      // Register tracks in our registry
      stream.getTracks().forEach((track) => {
        MediaTrackRegistry.registerLocalTrack(track);
      });

      dispatch(setLocalStream(stream));

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        logDebug("Local video source set");
      }

      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      logDebug(`Media error: ${error}`);
      toast.error("Media Error", {
        description:
          "Could not access camera or microphone. Please check permissions.",
      });
      return null;
    }
  }, [dispatch, logDebug]);

  // Process queued ICE candidates
  const processIceCandidates = useCallback(() => {
    if (
      peerConnectionRef.current &&
      peerConnectionRef.current.remoteDescription &&
      iceCandidatesQueue.current.length > 0
    ) {
      logDebug(
        `Processing ${iceCandidatesQueue.current.length} queued ICE candidates`
      );

      iceCandidatesQueue.current.forEach(async (candidate) => {
        try {
          await peerConnectionRef.current?.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
          logDebug("Added queued ICE candidate");
        } catch (err) {
          console.error("Error adding queued ICE candidate:", err);
          logDebug(`Error adding ICE candidate: ${err}`);
        }
      });

      iceCandidatesQueue.current = [];
    }
  }, [logDebug]);

  // Create peer connection with explicit transceivers
  const createPeerConnection = useCallback(
    (stream: MediaStream) => {
      try {
        logDebug("Creating peer connection...");

        // Close any existing connection
        if (peerConnectionRef.current) {
          logDebug("Closing existing peer connection");
          peerConnectionRef.current.close();
        }

        // Create peer connection with STUN/TURN servers
        const configuration: RTCConfiguration = {
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

        // Create transceivers for bidirectional media
        logDebug("Creating transceivers for bidirectional media");

        // Create audio transceiver with explicit direction
        const audioTransceiver = peerConnection.addTransceiver("audio", {
          direction: "sendrecv",
          streams: [stream],
        });
        logDebug(
          `Audio transceiver created with direction: ${audioTransceiver.direction}`
        );

        // Create video transceiver with explicit direction
        const videoTransceiver = peerConnection.addTransceiver("video", {
          direction: "sendrecv",
          streams: [stream],
        });
        logDebug(
          `Video transceiver created with direction: ${videoTransceiver.direction}`
        );

        // Add local tracks to peer connection
        logDebug("Adding tracks to peer connection...");
        stream.getTracks().forEach((track) => {
          logDebug(
            `Adding ${track.kind} track (${track.id}) to peer connection`
          );
          peerConnection.addTrack(track, stream);
        });

        // Log all senders to verify tracks were added
        const senders = peerConnection.getSenders();
        const sender = peerConnection.getSenders().find(s => s.track?.kind === "video");
        console.log("Remote sender track:", sender?.track);

        logDebug(`Peer connection has ${senders.length} senders`);
        senders.forEach((sender) => {
          if (sender.track) {
            logDebug(
              `Sender has ${sender.track.kind} track (${sender.track.id}), enabled: ${sender.track.enabled}`
            );
          }
        });

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            logDebug(
              `ICE candidate generated: ${event.candidate.candidate.substring(
                0,
                50
              )}...`
            );
            sendSignalingMessage({
              type: "candidate",
              sender: username,
              target: targetUser,
              candidate: event.candidate.toJSON(),
            });
          } else {
            logDebug("ICE gathering complete");
          }
        };

        // Log ICE gathering state changes
        peerConnection.onicegatheringstatechange = () => {
          logDebug(`ICE gathering state: ${peerConnection.iceGatheringState}`);
        };

        // Log ICE connection state changes
        peerConnection.oniceconnectionstatechange = () => {
          logDebug(
            `ICE connection state: ${peerConnection.iceConnectionState}`
          );

          if (peerConnection.iceConnectionState === "failed") {
            logDebug("ICE connection failed, restarting ICE");
            peerConnection.restartIce();
          }

          if (
            peerConnection.iceConnectionState === "connected" ||
            peerConnection.iceConnectionState === "completed"
          ) {
            toast.success("Media connection established");

            // Start connection check interval when ICE is connected
            startConnectionCheckInterval();
          }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
          logDebug(`Connection state: ${peerConnection.connectionState}`);
          if (peerConnection.connectionState === "connected") {
            dispatch(setIsConnected(true));
            dispatch(setCallStatus("connected"));
            setIsReconnecting(false);
            toast.success("Call connected");

            // Reset video playback attempts counter
            videoPlaybackAttemptsRef.current = 0;

            // Force a check for remote stream
            checkAndCreateSyntheticStream();
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
          logDebug("Negotiation needed");
          if (
            peerConnection.signalingState === "stable" &&
            isCallInitiator.current
          ) {
            try {
              logDebug("Creating offer due to negotiation needed");
              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                voiceActivityDetection: false,
              } as RTCOfferOptions);

              logDebug(
                `Offer created: ${JSON.stringify(offer).substring(0, 100)}...`
              );
              await peerConnection.setLocalDescription(offer);
              logDebug("Local description set");

              sendSignalingMessage({
                type: "offer",
                sender: username,
                target: targetUser,
                sdp: peerConnection.localDescription ?? undefined,
              });
            } catch (err) {
              console.error("Error during negotiation:", err);
              logDebug(`Error during negotiation: ${err}`);
            }
          }
        };

        // Handle remote stream
        peerConnection.ontrack = (event) => {
          logDebug(`[WebRTC] Received track: 
            Kind: ${event.track.kind}, 
            Track ID: ${event.track.id}, 
            Streams: ${event.streams.length}, 
            Initiator: ${isCallInitiator.current ? 'Caller' : 'Callee'}
          `);
          logDebug(
            `Received remote track: ${event.track.kind} (${event.track.id})`
          );
          logDebug(`Remote streams: ${event.streams.length}`);

          if (event.streams && event.streams[0]) {
            const remoteStream = event.streams[0];
            remoteStreamRef.current = remoteStream;
            hasReceivedRemoteStream.current = true;

            logDebug(`Setting remote stream: ${remoteStream.id}`);
            logDebug(
              `Remote stream has ${
                remoteStream.getVideoTracks().length
              } video tracks and ${
                remoteStream.getAudioTracks().length
              } audio tracks`
            );

            // Log all tracks in the remote stream
            remoteStream.getTracks().forEach((track) => {
              logDebug(
                `Remote track: ${track.kind} (${track.id}), enabled: ${track.enabled}, muted: ${track.muted}`
              );
              // Ensure track is enabled
              track.enabled = true;
            });

            // Register remote tracks
            remoteStream.getTracks().forEach((track) => {
              MediaTrackRegistry.registerRemoteTrack(track);
            });

            // Force a UI update by creating a new MediaStream with the same tracks
            const newStream = new MediaStream();
            remoteStream.getTracks().forEach((track) => {
              newStream.addTrack(track);
            });

            dispatch(setRemoteStream(newStream));

            // Reset video key to force re-render of video element
            setVideoKey((prev) => prev + 1);

            // Use a timeout to ensure the video element is ready
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = newStream;
                logDebug("Remote video source set");

                // Try to play the video
                playRemoteVideo();
              }
            }, 100);

            // Notify that we have a remote stream
            toast.success("Remote video connected");
          } else if (event.track) {
            // If we have a track but no stream, create a synthetic stream
            logDebug(
              "Received track without stream, creating synthetic stream"
            );

            // Create a new stream if we don't have one
            if (!remoteStreamRef.current) {
              remoteStreamRef.current = new MediaStream();
              hasReceivedRemoteStream.current = true;
            }

            // Ensure track is enabled
            event.track.enabled = true;

            // Add the track to our synthetic stream
            remoteStreamRef.current.addTrack(event.track);

            // Register the track
            MediaTrackRegistry.registerRemoteTrack(event.track);

            logDebug(`Added ${event.track.kind} track to synthetic stream`);

            // Create a new stream for Redux to trigger UI update
            const newStream = new MediaStream();
            remoteStreamRef.current.getTracks().forEach((track) => {
              newStream.addTrack(track);
            });

            dispatch(setRemoteStream(newStream));

            // Reset video key to force re-render of video element
            setVideoKey((prev) => prev + 1);

            // Use a timeout to ensure the video element is ready
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = newStream;
                logDebug("Remote video source set with synthetic stream");

                // Try to play the video
                playRemoteVideo();
              }
            }, 100);
          }
        };

        return peerConnection;
      } catch (error) {
        console.error("Error creating peer connection:", error);
        logDebug(`Error creating peer connection: ${error}`);
        toast.error("Connection Error", {
          description: "Failed to create peer connection.",
        });
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, sendSignalingMessage, targetUser, username, logDebug]
  );

  // Check and create synthetic stream from receivers if needed
  const checkAndCreateSyntheticStream = useCallback(() => {
    if (!peerConnectionRef.current) return false;

    // If we already have a remote stream, no need to create a synthetic one
    if (
      remoteStreamRef.current &&
      remoteStreamRef.current.getTracks().length > 0
    ) {
      return false;
    }

    logDebug("Checking for receivers to create synthetic stream");

    // Check receivers
    const receivers = peerConnectionRef.current.getReceivers();
    if (receivers.length === 0) {
      logDebug("No receivers found");
      return false;
    }

    logDebug(`Found ${receivers.length} receivers, checking for tracks`);

    // Check if any receivers have tracks
    const tracksFound = receivers.some((r) => r.track);

    if (!tracksFound) {
      logDebug("No tracks found in receivers");
      return false;
    }

    logDebug("Receivers have tracks, creating synthetic stream");

    // Create a synthetic stream from receiver tracks
    const syntheticStream = new MediaStream();
    let hasAddedTracks = false;

    receivers.forEach((receiver) => {
      if (receiver.track) {
        receiver.track.enabled = true;
        syntheticStream.addTrack(receiver.track);
        logDebug(`Added ${receiver.track.kind} track to synthetic stream`);
        hasAddedTracks = true;
      }
    });

    if (!hasAddedTracks) {
      logDebug("No tracks were added to synthetic stream");
      return false;
    }

    // Set as remote stream
    remoteStreamRef.current = syntheticStream;
    hasReceivedRemoteStream.current = true;

    // Update UI
    dispatch(setRemoteStream(syntheticStream));

    // Reset video key to force re-render of video element
    setVideoKey((prev) => prev + 1);

    // Use a timeout to ensure the video element is ready
    setTimeout(() => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = syntheticStream;
        logDebug("Remote video source set with synthetic stream");

        // Try to play the video
        playRemoteVideo();
      }
    }, 100);

    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, logDebug]);

  // Play remote video with multiple fallback strategies
  const playRemoteVideo = useCallback(() => {
    if (!remoteVideoRef.current || !remoteVideoRef.current.srcObject) {
      logDebug("Cannot play remote video - no video element or source");
      return false;
    }

    logDebug(
      `Attempt ${videoPlaybackAttemptsRef.current + 1}: Trying to play video...`
    );
    videoPlaybackAttemptsRef.current++;

    // Try to play normally first
    remoteVideoRef.current
      .play()
      .then(() => {
        logDebug("Remote video playback started successfully");
        setShowPlayButton(false);
        return true;
      })
      .catch(async (err) => {
        logDebug(
          `Attempt ${videoPlaybackAttemptsRef.current}: Playback failed: ${err}`
        );

        // If this is our first few attempts, try with muted first (browsers are more permissive with muted videos)
        if (videoPlaybackAttemptsRef.current <= 3) {
          logDebug("Trying to play muted first");
          const wasMuted = remoteVideoRef.current!.muted;
          remoteVideoRef.current!.muted = true;

          try {
            await remoteVideoRef.current!.play();
            logDebug("Muted playback successful, unmuting now");
            // After successful play, unmute if it wasn't muted before
            setTimeout(() => {
              if (remoteVideoRef.current) {
                remoteVideoRef.current.muted = wasMuted;
              }
            }, 1000);
            setShowPlayButton(false);
            return true;
          } catch (mutedErr) {
            logDebug(`Muted playback also failed: ${mutedErr}`);
            // Restore original muted state
            if (remoteVideoRef.current) {
              remoteVideoRef.current.muted = wasMuted;
            }
          }
        }

        // If we've tried a few times, try the nuclear option: recreate the video element
        if (videoPlaybackAttemptsRef.current >= 3) {
          logDebug("Showing play button as fallback");
          setShowPlayButton(true);
        }

        return false;
      });
  }, [logDebug]);

  // Start connection check interval
  const startConnectionCheckInterval = useCallback(() => {
    // Clear any existing interval
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current);
    }

    // Start a new interval
    connectionCheckIntervalRef.current = setInterval(() => {
      if (!peerConnectionRef.current) return;

      // Check if we have a remote stream
      if (
        !hasReceivedRemoteStream.current ||
        !remoteStreamRef.current ||
        remoteStreamRef.current.getTracks().length === 0
      ) {
        logDebug("No remote stream detected in check interval");

        // Check if we need to force renegotiation
        if (
          peerConnectionRef.current.connectionState === "connected" ||
          peerConnectionRef.current.iceConnectionState === "connected" ||
          peerConnectionRef.current.iceConnectionState === "completed"
        ) {
          logDebug(
            "Connection looks good but no remote stream, forcing renegotiation"
          );

          // Try to create a synthetic stream from receivers
          const syntheticStreamCreated = checkAndCreateSyntheticStream();

          // If we couldn't create a synthetic stream, try other methods
          if (!syntheticStreamCreated) {
            // Try to force renegotiation
            if (isCallInitiator.current) {
              try {
                // Modify a parameter to trigger renegotiation
                const sender = peerConnectionRef.current
                  .getSenders()
                  .find((s) => s.track?.kind === "video");
                if (sender) {
                  const params = sender.getParameters();
                  if (!params.degradationPreference) {
                    params.degradationPreference = "maintain-framerate";
                    sender
                      .setParameters(params)
                      .catch((e) => logDebug(`Error setting parameters: ${e}`));
                    logDebug(
                      "Modified sender parameters to force renegotiation"
                    );
                  }
                }

                // Also try restarting ICE
                try {
                  peerConnectionRef.current.restartIce();
                  logDebug("Restarted ICE to force connection refresh");
                } catch (e) {
                  logDebug(`Error restarting ICE: ${e}`);
                }
              } catch (e) {
                logDebug(`Error during forced renegotiation: ${e}`);
              }
            }
          }
        }
      } else if (remoteStreamRef.current) {
        // Check if remote stream has active tracks
        const videoTracks = remoteStreamRef.current.getVideoTracks();
        const audioTracks = remoteStreamRef.current.getAudioTracks();

        logDebug(
          `Remote stream check - Video tracks: ${videoTracks.length}, Audio tracks: ${audioTracks.length}`
        );

        // Check if video tracks are enabled
        videoTracks.forEach((track) => {
          if (!track.enabled) {
            logDebug(`Enabling disabled video track: ${track.id}`);
            track.enabled = true;
          }
        });

        // If we have a remote stream but it's not showing, try to refresh it
        if (remoteVideoRef.current && remoteVideoRef.current.paused) {
          logDebug("Remote video is paused, trying to play it");
          playRemoteVideo();
        }

        // If we have a remote stream in ref but not in Redux state, update it
        if (remoteStreamRef.current && !remoteStream) {
          logDebug("Found remote stream in ref but not in state, updating...");

          // Create a new stream with the same tracks
          const newStream = new MediaStream();
          remoteStreamRef.current.getTracks().forEach((track) => {
            track.enabled = true;
            newStream.addTrack(track);
          });

          // Update Redux state
          dispatch(setRemoteStream(newStream));

          // Reset video key to force re-render of video element
          setVideoKey((prev) => prev + 1);

          // Update video element
          setTimeout(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = newStream;
              playRemoteVideo();
            }
          }, 100);
        }
      }

      // Check peer connection health
      if (peerConnectionRef.current) {
        fixWebRTCIssues();
      }
    }, 1000); // Check every second

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    logDebug,
    remoteStream,
    dispatch,
    checkAndCreateSyntheticStream,
    playRemoteVideo,
  ]);

  // Fix WebRTC issues
  const fixWebRTCIssues = useCallback(() => {
    if (!peerConnectionRef.current) return;

    logDebug("Attempting to fix WebRTC issues...");

    // Check senders
    const senders = peerConnectionRef.current.getSenders();
    logDebug(`Peer connection has ${senders.length} senders`);

    senders.forEach((sender) => {
      if (sender.track) {
        logDebug(
          `Sender has ${sender.track.kind} track (${sender.track.id}), enabled: ${sender.track.enabled}`
        );
        if (!sender.track.enabled) {
          logDebug(`Enabling disabled track: ${sender.track.id}`);
          sender.track.enabled = true;
        }
      }
    });

    // Check transceivers
    const transceivers = peerConnectionRef.current.getTransceivers();
    logDebug(`Peer connection has ${transceivers.length} transceivers`);

    transceivers.forEach((transceiver) => {
      logDebug(`Transceiver direction: ${transceiver.direction}`);
      // Fix transceiver direction if needed
      if (transceiver.direction !== "sendrecv") {
        try {
          transceiver.direction = "sendrecv";
          logDebug(`Changed transceiver direction to sendrecv`);
        } catch (e) {
          logDebug(`Error changing transceiver direction: ${e}`);
        }
      }
    });
  }, [logDebug]);

  // Handle incoming WebRTC signaling messages
  useEffect(() => {
    if (!token) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSignalingMessage = async (message: any) => {
      logDebug(
        `Received signaling message: ${message.type} from ${message.sender}`
      );

      // Ignore messages from self
      if (message.sender === username) return;

      switch (message.type) {
        case "call-request":
          logDebug(`Received call request from: ${message.sender}`);
          setCallerName(message.sender);
          setTargetUser(message.sender);
          dispatch(setIncomingCall(true));
          isCallInitiator.current = false;
          break;

        case "call-accepted":
          logDebug(`Call accepted by: ${message.sender}`);
          if (message.target === username) {
            dispatch(setOutgoingCall(false));
            dispatch(setCallStatus("connecting"));
            toast.success("Call accepted");
            isCallInitiator.current = true;

            // Create offer
            const stream = localStream || (await initializeMedia());
            if (!stream) {
              logDebug("Failed to get local media stream");
              toast.error("Failed to get local media stream");
              return;
            }

            const peerConnection = createPeerConnection(stream);
            if (!peerConnection) {
              logDebug("Failed to create peer connection");
              toast.error("Failed to create peer connection");
              return;
            }

            try {
              logDebug("Creating offer...");
              const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                voiceActivityDetection: false,
              } as RTCOfferOptions);
              logDebug(
                `Offer created: ${JSON.stringify(offer).substring(0, 100)}...`
              );

              await peerConnection.setLocalDescription(offer);
              logDebug("Local description set");

              sendSignalingMessage({
                type: "offer",
                sender: username,
                target: message.sender,
                sdp: offer,
              });
            } catch (error) {
              console.error("Error creating offer:", error);
              logDebug(`Error creating offer: ${error}`);
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
          logDebug(`Received offer from: ${message.sender}`);
          if (message.target === username) {
            const stream = localStream || (await initializeMedia());
            if (!stream) {
              logDebug("Failed to get local media stream");
              toast.error("Failed to get local media stream");
              return;
            }

            isCallInitiator.current = false;
            const peerConnection = createPeerConnection(stream);
            if (!peerConnection) {
              logDebug("Failed to create peer connection");
              toast.error("Failed to create peer connection");
              return;
            }

            try {
              logDebug("Setting remote description (offer)");
              await peerConnection.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );
              logDebug("Remote description set");

              // Process any queued ICE candidates
              processIceCandidates();

              logDebug("Creating answer...");
              const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
                voiceActivityDetection: false,
              });
              logDebug(
                `Answer created: ${JSON.stringify(answer).substring(0, 100)}...`
              );

              await peerConnection.setLocalDescription(answer);
              logDebug("Local description set (answer)");

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
              logDebug(`Error handling offer: ${error}`);
              toast.error("Call Error", {
                description: "Failed to answer call.",
              });
            }
          }
          break;

        case "answer":
          logDebug(`Received answer from: ${message.sender}`);
          if (message.target === username && peerConnectionRef.current) {
            try {
              logDebug("Setting remote description (answer)");
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(message.sdp)
              );
              logDebug("Remote description set successfully");

              // Process any queued ICE candidates
              processIceCandidates();

              // Start connection check interval after setting remote description
              startConnectionCheckInterval();

              // Immediately check for synthetic stream
              setTimeout(() => {
                checkAndCreateSyntheticStream();
              }, 500);
            } catch (error) {
              console.error("Error handling answer:", error);
              logDebug(`Error handling answer: ${error}`);
              toast.error("Call Error", {
                description: "Failed to establish connection.",
              });
            }
          }
          break;

        case "candidate":
          logDebug(`Received ICE candidate from: ${message.sender}`);
          if (message.target === username && peerConnectionRef.current) {
            try {
              // If we have a remote description, add the candidate immediately
              if (peerConnectionRef.current.remoteDescription) {
                logDebug("Adding ICE candidate");
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(message.candidate)
                );
                logDebug("ICE candidate added successfully");
              } else {
                // Otherwise, queue the candidate for later
                logDebug("Queueing ICE candidate for later");
                iceCandidatesQueue.current.push(message.candidate);
              }
            } catch (error) {
              console.error("Error adding ICE candidate:", error);
              logDebug(`Error adding ICE candidate: ${error}`);
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
    logDebug,
    startConnectionCheckInterval,
    checkAndCreateSyntheticStream,
  ]);

  // Set up video refs when streams change
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      logDebug("Setting local video source");
      localVideoRef.current.srcObject = localStream;

      // Ensure all tracks are enabled
      localStream.getTracks().forEach((track) => {
        if (track.kind === "audio" && isMuted) {
          track.enabled = false;
        } else if (track.kind === "video" && isVideoOff) {
          track.enabled = false;
        } else {
          track.enabled = true;
        }
      });
    }

    if (remoteStream && remoteVideoRef.current) {
      logDebug("Setting remote video source");
      remoteVideoRef.current.srcObject = remoteStream;

      // Ensure all tracks are enabled
      remoteStream.getTracks().forEach((track) => {
        track.enabled = true;
      });

      // Try to play the video
      playRemoteVideo();

      // Set up event handlers for the remote video
      const remoteVideo = remoteVideoRef.current;

      const handleCanPlay = () => {
        logDebug("Remote video can play now");
        playRemoteVideo();
      };

      remoteVideo.addEventListener("canplay", handleCanPlay);

      return () => {
        remoteVideo.removeEventListener("canplay", handleCanPlay);
      };
    }
  }, [
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    logDebug,
    playRemoteVideo,
    videoKey,
  ]);

  // Start connection check interval when connected
  useEffect(() => {
    if (isConnected) {
      startConnectionCheckInterval();

      // Immediately check for synthetic stream
      setTimeout(() => {
        checkAndCreateSyntheticStream();
      }, 500);
    }

    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, [
    isConnected,
    startConnectionCheckInterval,
    checkAndCreateSyntheticStream,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
      endCall();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCall = async (targetUsername: string) => {
    logDebug(`Starting call to: ${targetUsername}`);
    setTargetUser(targetUsername);
    dispatch(setOutgoingCall(true));
    isCallInitiator.current = true;
    hasReceivedRemoteStream.current = false;
    videoPlaybackAttemptsRef.current = 0;

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
    logDebug(`Accepting call from: ${callerName}`);
    dispatch(setIncomingCall(false));
    isCallInitiator.current = false;
    hasReceivedRemoteStream.current = false;
    videoPlaybackAttemptsRef.current = 0;

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
    logDebug(`Rejecting call from: ${callerName}`);
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
    logDebug("Ending call");
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

    // Clear connection check interval
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current);
      connectionCheckIntervalRef.current = null;
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
    isCallInitiator.current = false;
    hasReceivedRemoteStream.current = false;
    remoteStreamRef.current = null;
    videoPlaybackAttemptsRef.current = 0;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    toast("Call Ended");
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
        logDebug(`Audio track ${track.id} enabled: ${track.enabled}`);
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
        logDebug(`Video track ${track.id} enabled: ${track.enabled}`);
      });
      dispatch(setIsVideoOff(!isVideoOff));
      toast(isVideoOff ? "Camera Turned On" : "Camera Turned Off");
    }
  };

  const reconnectCall = async () => {
    logDebug("Attempting to reconnect call...");
    setIsReconnecting(true);
    hasReceivedRemoteStream.current = false;
    videoPlaybackAttemptsRef.current = 0;

    // Close existing connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Create a new connection
    if (localStream) {
      const peerConnection = createPeerConnection(localStream);
      if (!peerConnection) {
        logDebug("Failed to create peer connection during reconnect");
        setIsReconnecting(false);
        return;
      }

      try {
        if (isCallInitiator.current) {
          logDebug("Creating new offer for reconnection...");
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            voiceActivityDetection: false,
          } as RTCOfferOptions);

          await peerConnection.setLocalDescription(offer);

          sendSignalingMessage({
            type: "offer",
            sender: username,
            target: targetUser,
            sdp: offer,
          });
        }
      } catch (error) {
        console.error("Error during reconnection:", error);
        logDebug(`Reconnection error: ${error}`);
        setIsReconnecting(false);
      }
    }
  };

  // Force refresh remote stream
  const forceRefreshRemoteStream = () => {
    logDebug("Forcing refresh of remote stream...");
    videoPlaybackAttemptsRef.current = 0;

    if (remoteStreamRef.current && remoteVideoRef.current) {
      // Create a new MediaStream with the same tracks
      const newStream = new MediaStream();
      remoteStreamRef.current.getTracks().forEach((track) => {
        // Ensure tracks are enabled
        track.enabled = true;
        newStream.addTrack(track);
      });

      // Update Redux state
      dispatch(setRemoteStream(newStream));

      // Reset video key to force re-render of video element
      setVideoKey((prev) => prev + 1);

      // Use a timeout to ensure the video element is ready
      setTimeout(() => {
        // Update the video element
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = newStream;
          logDebug("Remote video source set after refresh");

          // Try to play the video
          playRemoteVideo();
        }
      }, 100);
    } else {
      logDebug("Cannot refresh remote stream - no stream available");

      // If we have a peer connection but no remote stream, try to create a synthetic one
      checkAndCreateSyntheticStream();
    }
  };

  const forcePlayVideos = () => {
    logDebug("User interaction - attempting to play videos");
    setShowPlayButton(false);
    videoPlaybackAttemptsRef.current = 0;

    if (localVideoRef.current && localVideoRef.current.paused && localStream) {
      localVideoRef.current
        .play()
        .catch((err) => logDebug(`Could not play local video: ${err}`));
    }

    if (
      remoteVideoRef.current &&
      remoteVideoRef.current.paused &&
      remoteStreamRef.current
    ) {
      playRemoteVideo();
    }

    // Also try to force refresh the remote stream
    forceRefreshRemoteStream();
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {!isConnected && !outgoingCall && callStatus === "idle" ? (
          <CallUserList
            users={roomUsers}
            currentUsername={username}
            onCallUser={startCall}
          />
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <VideoStream
                stream={localStream}
                username={username}
                isLocal={true}
                isVideoOff={isVideoOff}
              />

              <VideoStream
                stream={remoteStream}
                username={targetUser}
                isLocal={false}
                onClick={forcePlayVideos}
                showPlayButton={showPlayButton}
              />
            </div>

            <CallControls
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isConnected={isConnected}
              isReconnecting={isReconnecting}
              callStatus={callStatus}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onRefreshVideo={forceRefreshRemoteStream}
              onReconnect={reconnectCall}
              onEndCall={endCall}
            />

            <DebugPanel debugInfo={debugInfo} />
          </div>
        )}
      </div>

      <IncomingCallDialog
        open={incomingCall}
        callerName={callerName}
        onAccept={acceptCall}
        onReject={rejectCall}
        onOpenChange={(open) => !open && rejectCall()}
      />
    </>
  );
}
