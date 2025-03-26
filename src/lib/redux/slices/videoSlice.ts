import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface VideoState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  isConnected: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  incomingCall: boolean;
  outgoingCall: boolean;
  callStatus: "idle" | "connecting" | "connected" | "disconnected" | "failed";
}

const initialState: VideoState = {
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isConnected: false,
  isMuted: false,
  isVideoOff: false,
  incomingCall: false,
  outgoingCall: false,
  callStatus: "idle",
};

const videoSlice = createSlice({
  name: "video",
  initialState,
  reducers: {
    setLocalStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.localStream = action.payload;
    },
    setRemoteStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.remoteStream = action.payload;
    },
    setPeerConnection: (
      state,
      action: PayloadAction<RTCPeerConnection | null>
    ) => {
      state.peerConnection = action.payload;
    },
    setIsConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    setIsVideoOff: (state, action: PayloadAction<boolean>) => {
      state.isVideoOff = action.payload;
    },
    setIncomingCall: (state, action: PayloadAction<boolean>) => {
      state.incomingCall = action.payload;
    },
    setOutgoingCall: (state, action: PayloadAction<boolean>) => {
      state.outgoingCall = action.payload;
    },
    setCallStatus: (state, action: PayloadAction<VideoState["callStatus"]>) => {
      state.callStatus = action.payload;
    },
    resetVideoState: (state) => {
      // Don't reset streams and connection here as they need proper cleanup
      state.isConnected = false;
      state.incomingCall = false;
      state.outgoingCall = false;
      state.callStatus = "idle";
    },
  },
});

export const {
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
} = videoSlice.actions;

export default videoSlice.reducer;
