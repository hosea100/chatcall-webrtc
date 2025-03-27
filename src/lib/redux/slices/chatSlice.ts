import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Message } from "@/types/chat";

interface ChatState {
  messages: Message[];
  isAtBottom: boolean;
}

const initialState: ChatState = {
  messages: [],
  isAtBottom: true,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setIsAtBottom: (state, action: PayloadAction<boolean>) => {
      state.isAtBottom = action.payload;
    },
  },
});

export const { addMessage, setMessages, clearMessages, setIsAtBottom } =
  chatSlice.actions;
export default chatSlice.reducer;
