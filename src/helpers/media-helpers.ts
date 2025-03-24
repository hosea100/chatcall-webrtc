// helpers/media-helpers.ts

export const MediaTrackRegistry = (() => {
  let localTracks: MediaStreamTrack[] = [];
  let remoteTracks: MediaStreamTrack[] = [];

  return {
    registerLocalTrack: (track: MediaStreamTrack) => {
      localTracks.push(track);
    },
    registerRemoteTrack: (track: MediaStreamTrack) => {
      remoteTracks.push(track);
    },
    getLocalTracks: () => [...localTracks],
    getRemoteTracks: () => [...remoteTracks],
    clearAllTracks: () => {
      // Stop all tracks before clearing
      localTracks.forEach((track) => {
        if (track.readyState === "live") {
          track.stop();
        }
      });
      remoteTracks.forEach((track) => {
        if (track.readyState === "live") {
          track.stop();
        }
      });

      localTracks = [];
      remoteTracks = [];
    },
  };
})();

// Storage keys for call status
export const CALL_STATUS_KEY = "video-call-active-status";
export const ROOM_ID_KEY = "video-call-room-id";

// Function to clean up all media resources
export const cleanupMedia = () => {
  // Clear global registry
  MediaTrackRegistry.clearAllTracks();

  // Clear session storage
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CALL_STATUS_KEY);
    sessionStorage.removeItem(ROOM_ID_KEY);
  }
};
