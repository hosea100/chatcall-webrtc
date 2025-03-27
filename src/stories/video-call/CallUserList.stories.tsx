import type { Meta, StoryObj } from "@storybook/react";
import { CallUserList } from "@/components/video-call/user-list";

const meta: Meta<typeof CallUserList> = {
  title: "VideoCall/CallUserList",
  component: CallUserList,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    users: { control: "object" },
    currentUsername: { control: "text" },
    onCallUser: { action: "callUser" },
  },
};

export default meta;
type Story = StoryObj<typeof CallUserList>;

export const WithUsers: Story = {
  args: {
    users: {
      Alice: { online: true, socketId: "socket1" },
      Bob: { online: true, socketId: "socket2" },
      Charlie: { online: false, socketId: "socket3" },
      Dave: { online: true, socketId: "socket4" },
    },
    currentUsername: "Alice",
  },
};

export const NoUsers: Story = {
  args: {
    users: {},
    currentUsername: "Alice",
  },
};

export const OnlyOfflineUsers: Story = {
  args: {
    users: {
      Bob: { online: false, socketId: "socket2" },
      Charlie: { online: false, socketId: "socket3" },
    },
    currentUsername: "Alice",
  },
};
