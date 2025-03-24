import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "@/types/user";

interface UsersState {
  roomUsers: Record<string, User>;
}

const initialState: UsersState = {
  roomUsers: {},
};

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setRoomUsers: (state, action: PayloadAction<Record<string, User>>) => {
      state.roomUsers = action.payload;
    },
    clearRoomUsers: (state) => {
      state.roomUsers = {};
    },
  },
});

export const { setRoomUsers, clearRoomUsers } = usersSlice.actions;
export default usersSlice.reducer;
