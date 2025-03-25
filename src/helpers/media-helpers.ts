// helpers/media-helpers.ts

export const MediaTrackRegistry = (() => {
  let localTracks: MediaStreamTrack[] = [];
  let remoteTracks: MediaStreamTrack[] = [];

  return {
    registerLocalTrack: (track: MediaStreamTrack) => {
      // Check if track is already registered to avoid duplicates
      if (!localTracks.some((t) => t.id === track.id)) {
        localTracks.push(track);
        console.log(`Registered local ${track.kind} track: ${track.id}`);
      }
    },
    registerRemoteTrack: (track: MediaStreamTrack) => {
      // Check if track is already registered to avoid duplicates
      if (!remoteTracks.some((t) => t.id === track.id)) {
        remoteTracks.push(track);
        console.log(`Registered remote ${track.kind} track: ${track.id}`);
      }
    },
    getLocalTracks: () => [...localTracks],
    getRemoteTracks: () => [...remoteTracks],
    clearAllTracks: () => {
      // Stop all tracks before clearing
      console.log(
        `Clearing ${localTracks.length} local tracks and ${remoteTracks.length} remote tracks`
      );

      localTracks.forEach((track) => {
        if (track.readyState === "live") {
          console.log(`Stopping local ${track.kind} track: ${track.id}`);
          track.stop();
        }
      });
      remoteTracks.forEach((track) => {
        if (track.readyState === "live") {
          console.log(`Stopping remote ${track.kind} track: ${track.id}`);
          track.stop();
        }
      });

      localTracks = [];
      remoteTracks = [];
      console.log("All tracks cleared and stopped");
    },
  };
})();

// Storage keys for call status
export const CALL_STATUS_KEY = "video-call-active-status";
export const ROOM_ID_KEY = "video-call-room-id";

// Function to clean up all media resources
export const cleanupMedia = () => {
  console.log("Running cleanup procedure");

  // Clear global registry
  MediaTrackRegistry.clearAllTracks();

  // Clear session storage
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CALL_STATUS_KEY);
    sessionStorage.removeItem(ROOM_ID_KEY);
  }

  console.log("Media cleanup completed");
};

// WebRTC helper functions
export const createPeerConnection = (iceServers: RTCIceServer[] = []) => {
  const defaultIceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ];

  const configuration = {
    iceServers: iceServers.length > 0 ? iceServers : defaultIceServers,
  };

  return new RTCPeerConnection(configuration);
};

export const getLocalMedia = async (
  constraints = { video: true, audio: true }
) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error("Error accessing media devices:", error);
    throw error;
  }
};

// Helper to handle autoplay restrictions
export const tryPlayVideo = async (
  videoElement: HTMLVideoElement
): Promise<void> => {
  if (!videoElement) return;

  try {
    // Check if the browser requires user interaction
    if (videoElement.paused) {
      // Try to play
      await videoElement.play();
      console.log("Video playback started successfully");
    }
  } catch (error) {
    console.warn("Autoplay prevented by browser:", error);

    // We could add a UI indicator here that user interaction is needed
    // This is handled in the component with the click handler
  }
};

// Add a function to check browser autoplay policy
export const checkAutoplaySupport = async (): Promise<boolean> => {
  try {
    // Create a temporary video element
    const video = document.createElement("video");
    video.muted = true;

    // Create a minimal video stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = stream;

    // Try to play it
    await video.play();

    // Clean up
    video.pause();
    stream.getTracks().forEach((track) => track.stop());

    return true; // Autoplay is supported
  } catch (error) {
    console.warn("Autoplay not supported without user interaction:", error);
    return false; // Autoplay is not supported
  }
};
