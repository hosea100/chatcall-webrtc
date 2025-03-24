import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import chatReducer from "./slices/chatSlice";
import usersReducer from "./slices/usersSlice";
import videoReducer from "./slices/videoSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    users: usersReducer,
    video: videoReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          "video/setLocalStream",
          "video/setRemoteStream",
          "video/setPeerConnection",
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ["payload.stream", "payload.connection"],
        // Ignore these paths in the state
        ignoredPaths: [
          "video.localStream",
          "video.remoteStream",
          "video.peerConnection",
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
