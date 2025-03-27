import type { Meta, StoryObj } from "@storybook/react";
import { VideoStream } from "@/components/video-call/video-stream";

// Mock MediaStream for Storybook
class MockMediaStream {
  tracks: any[] = [];

  constructor() {
    // Add mock tracks
    this.tracks.push({ kind: "video", enabled: true });
    this.tracks.push({ kind: "audio", enabled: true });
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === "video");
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === "audio");
  }
}

const meta: Meta<typeof VideoStream> = {
  title: "VideoCall/VideoStream",
  component: VideoStream,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    stream: { control: "object" },
    username: { control: "text" },
    isLocal: { control: "boolean" },
    isVideoOff: { control: "boolean" },
    showPlayButton: { control: "boolean" },
    onClick: { action: "clicked" },
  },
};

export default meta;
type Story = StoryObj<typeof VideoStream>;

export const NoStream: Story = {
  args: {
    stream: null,
    username: "User",
    isLocal: false,
  },
};

export const LocalStream: Story = {
  args: {
    stream: new MockMediaStream() as unknown as MediaStream,
    username: "LocalUser",
    isLocal: true,
  },
};

export const RemoteStream: Story = {
  args: {
    stream: new MockMediaStream() as unknown as MediaStream,
    username: "RemoteUser",
    isLocal: false,
  },
};

export const VideoOff: Story = {
  args: {
    stream: new MockMediaStream() as unknown as MediaStream,
    username: "User",
    isVideoOff: true,
  },
};

export const WithPlayButton: Story = {
  args: {
    stream: new MockMediaStream() as unknown as MediaStream,
    username: "User",
    showPlayButton: true,
  },
};
