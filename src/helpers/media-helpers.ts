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

// Helper to handle autoplay restrictions
export const tryPlayVideo = async (
  videoElement: HTMLVideoElement
): Promise<boolean> => {
  if (!videoElement) return false;

  try {
    // Check if the browser requires user interaction
    if (videoElement.paused) {
      // Try to play
      await videoElement.play();
      console.log("Video playback started successfully");
      return true;
    }
    return !videoElement.paused;
  } catch (error) {
    console.warn("Autoplay prevented by browser:", error);
    // We could add a UI indicator here that user interaction is needed
    return false;
  }
};

// Helper to diagnose media stream issues
export const diagnoseMediaStream = (
  stream: MediaStream | null,
  label: string
): void => {
  if (!stream) {
    console.log(`[Diagnosis] ${label} stream is null`);
    return;
  }

  console.log(`[Diagnosis] ${label} stream ID: ${stream.id}`);
  console.log(`[Diagnosis] ${label} stream active: ${stream.active}`);

  const videoTracks = stream.getVideoTracks();
  const audioTracks = stream.getAudioTracks();

  console.log(`[Diagnosis] ${label} video tracks: ${videoTracks.length}`);
  console.log(`[Diagnosis] ${label} audio tracks: ${audioTracks.length}`);

  videoTracks.forEach((track, index) => {
    console.log(`[Diagnosis] ${label} video track ${index}:`);
    console.log(`  - ID: ${track.id}`);
    console.log(`  - Enabled: ${track.enabled}`);
    console.log(`  - Muted: ${track.muted}`);
    console.log(`  - ReadyState: ${track.readyState}`);

    // Get video track settings
    const settings = track.getSettings();
    console.log(`  - Width: ${settings.width}`);
    console.log(`  - Height: ${settings.height}`);
    console.log(`  - FrameRate: ${settings.frameRate}`);
  });

  audioTracks.forEach((track, index) => {
    console.log(`[Diagnosis] ${label} audio track ${index}:`);
    console.log(`  - ID: ${track.id}`);
    console.log(`  - Enabled: ${track.enabled}`);
    console.log(`  - Muted: ${track.muted}`);
    console.log(`  - ReadyState: ${track.readyState}`);
  });
};

// Helper to fix common WebRTC issues
export const fixWebRTCIssues = (
  peerConnection: RTCPeerConnection | null
): void => {
  if (!peerConnection) return;

  // Check and fix transceiver directions
  peerConnection.getTransceivers().forEach((transceiver) => {
    if (transceiver.direction !== "sendrecv") {
      console.log(
        `Fixing transceiver direction from ${transceiver.direction} to sendrecv`
      );
      try {
        transceiver.direction = "sendrecv";
      } catch (e) {
        console.error("Error setting transceiver direction:", e);
      }
    }
  });

  // Check connection state
  console.log(`Connection state: ${peerConnection.connectionState}`);
  console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
  console.log(`Signaling state: ${peerConnection.signalingState}`);

  // If ICE connection failed, try to restart ICE
  if (peerConnection.iceConnectionState === "failed") {
    console.log("ICE connection failed, restarting ICE");
    peerConnection.restartIce();
  }

  // Check if we have senders and receivers
  const senders = peerConnection.getSenders();
  const receivers = peerConnection.getReceivers();

  console.log(
    `Peer connection has ${senders.length} senders and ${receivers.length} receivers`
  );

  // Check if video senders and receivers are working
  const videoSender = senders.find((s) => s.track?.kind === "video");
  const videoReceiver = receivers.find((r) => r.track?.kind === "video");

  if (videoSender && videoSender.track) {
    console.log(
      `Video sender track: ${videoSender.track.id}, enabled: ${videoSender.track.enabled}`
    );
    if (!videoSender.track.enabled) {
      console.log("Enabling disabled video sender track");
      videoSender.track.enabled = true;
    }
  }

  if (videoReceiver && videoReceiver.track) {
    console.log(
      `Video receiver track: ${videoReceiver.track.id}, enabled: ${videoReceiver.track.enabled}`
    );
    if (!videoReceiver.track.enabled) {
      console.log("Enabling disabled video receiver track");
      videoReceiver.track.enabled = true;
    }
  }
};

// Advanced video playback helper with multiple fallback strategies
export const forcePlayVideo = async (
  videoElement: HTMLVideoElement,
  stream: MediaStream | null
): Promise<boolean> => {
  if (!videoElement || !stream) {
    console.log("Cannot force play video: missing video element or stream");
    return false;
  }

  console.log("Attempting to force play video with multiple strategies");

  // Make sure the video element has the stream
  if (videoElement.srcObject !== stream) {
    console.log("Setting stream to video element");
    videoElement.srcObject = stream;
  }

  // Strategy 1: Direct play
  try {
    console.log("Strategy 1: Direct play");
    await videoElement.play();
    console.log("Direct play successful");
    return true;
  } catch (error) {
    console.log(`Direct play failed: ${error}`);

    // Strategy 2: Play with muted first
    try {
      console.log("Strategy 2: Play with muted");
      const wasMuted = videoElement.muted;
      videoElement.muted = true;
      await videoElement.play();
      // After successful play, restore original muted state
      setTimeout(() => {
        videoElement.muted = wasMuted;
      }, 1000);
      console.log("Muted play successful");
      return true;
    } catch (error) {
      console.log(`Muted play failed: ${error}`);

      // Strategy 3: Clone the stream and try again
      try {
        console.log("Strategy 3: Clone stream");
        const newStream = new MediaStream();
        stream.getTracks().forEach((track) => {
          track.enabled = true;
          newStream.addTrack(track);
        });
        videoElement.srcObject = newStream;
        await videoElement.play();
        console.log("Play with cloned stream successful");
        return true;
      } catch (error) {
        console.log(`Cloned stream play failed: ${error}`);

        // Strategy 4: Create a new video element
        try {
          console.log("Strategy 4: Create new video element");
          const parent = videoElement.parentElement;
          if (!parent) {
            console.log("No parent element found");
            return false;
          }

          // Create a new video element
          const newVideo = document.createElement("video");
          newVideo.autoplay = true;
          newVideo.playsInline = true;
          newVideo.muted = videoElement.muted;
          newVideo.className = videoElement.className;
          newVideo.id = videoElement.id;
          newVideo.style.cssText = videoElement.style.cssText;

          // Set the stream
          newVideo.srcObject = stream;

          // Replace the old video element
          parent.replaceChild(newVideo, videoElement);

          // Try to play
          await newVideo.play();
          console.log("New video element play successful");
          return true;
        } catch (error) {
          console.log(`New video element play failed: ${error}`);
          return false;
        }
      }
    }
  }
};

// Create a synthetic stream from receivers
export const createSyntheticStreamFromReceivers = (
  peerConnection: RTCPeerConnection
): MediaStream | null => {
  if (!peerConnection) return null;

  const receivers = peerConnection.getReceivers();
  if (receivers.length === 0) {
    console.log("No receivers found to create synthetic stream");
    return null;
  }

  console.log(`Found ${receivers.length} receivers, creating synthetic stream`);

  const syntheticStream = new MediaStream();
  let hasAddedTracks = false;

  receivers.forEach((receiver) => {
    if (receiver.track) {
      // Ensure track is enabled
      receiver.track.enabled = true;

      // Add to synthetic stream
      syntheticStream.addTrack(receiver.track);
      console.log(
        `Added ${receiver.track.kind} track to synthetic stream: ${receiver.track.id}`
      );
      hasAddedTracks = true;

      // Register track
      MediaTrackRegistry.registerRemoteTrack(receiver.track);
    }
  });

  if (!hasAddedTracks) {
    console.log("No tracks were added to synthetic stream");
    return null;
  }

  return syntheticStream;
};
