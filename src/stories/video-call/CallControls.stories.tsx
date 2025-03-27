import type { Meta, StoryObj } from "@storybook/react";
import { CallControls } from "@/components/video-call/call-controls";

const meta: Meta<typeof CallControls> = {
  title: "VideoCall/CallControls",
  component: CallControls,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    isMuted: { control: "boolean" },
    isVideoOff: { control: "boolean" },
    isConnected: { control: "boolean" },
    isReconnecting: { control: "boolean" },
    callStatus: {
      control: "select",
      options: ["idle", "connecting", "connected", "disconnected", "failed"],
    },
    onToggleMute: { action: "toggleMute" },
    onToggleVideo: { action: "toggleVideo" },
    onRefreshVideo: { action: "refreshVideo" },
    onReconnect: { action: "reconnect" },
    onEndCall: { action: "endCall" },
  },
};

export default meta;
type Story = StoryObj<typeof CallControls>;

export const Default: Story = {
  args: {
    isMuted: false,
    isVideoOff: false,
    isConnected: true,
    isReconnecting: false,
    callStatus: "connected",
  },
};

export const Muted: Story = {
  args: {
    isMuted: true,
    isVideoOff: false,
    isConnected: true,
    isReconnecting: false,
    callStatus: "connected",
  },
};

export const VideoOff: Story = {
  args: {
    isMuted: false,
    isVideoOff: true,
    isConnected: true,
    isReconnecting: false,
    callStatus: "connected",
  },
};

export const Disconnected: Story = {
  args: {
    isMuted: false,
    isVideoOff: false,
    isConnected: false,
    isReconnecting: false,
    callStatus: "disconnected",
  },
};

export const Reconnecting: Story = {
  args: {
    isMuted: false,
    isVideoOff: false,
    isConnected: false,
    isReconnecting: true,
    callStatus: "disconnected",
  },
};
