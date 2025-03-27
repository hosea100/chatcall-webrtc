"use client";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VideoStream } from "@/components/video-call/video-stream";

// Mock MediaStream
class MockMediaStream {
  tracks: MediaStreamTrack[] = [];

  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track);
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

// Mock MediaStreamTrack
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class MockMediaStreamTrack {
  kind: string;
  id: string;
  enabled: boolean;

  constructor(kind: string) {
    this.kind = kind;
    this.id = Math.random().toString(36).substring(2, 15);
    this.enabled = true;
  }

  stop() {
    this.enabled = false;
  }
}

// Mock HTMLMediaElement
Object.defineProperty(window.HTMLMediaElement.prototype, "srcObject", {
  writable: true,
  value: null,
});

describe("VideoStream Component", () => {
  it("renders without stream", () => {
    render(<VideoStream stream={null} username="testuser" />);
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
  });

  it("renders with local stream", () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    render(
      <VideoStream stream={mockStream} username="testuser" isLocal={true} />
    );
    expect(screen.getByText("testuser (You)")).toBeInTheDocument();
  });

  it("renders with remote stream", () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    render(<VideoStream stream={mockStream} username="remoteuser" />);
    expect(screen.getByText("remoteuser")).toBeInTheDocument();
  });

  it("shows video off indicator when isVideoOff is true", () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const { container } = render(
      <VideoStream stream={mockStream} username="testuser" isVideoOff={true} />
    );
    // Check if the VideoOff icon is rendered
    expect(container.querySelector(".lucide-video-off")).toBeInTheDocument();
  });

  it("shows play button when showPlayButton is true", () => {
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    render(
      <VideoStream
        stream={mockStream}
        username="testuser"
        showPlayButton={true}
      />
    );
    expect(screen.getByText("Click to play video")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const mockStream = new MockMediaStream() as unknown as MediaStream;
    const handleClick = jest.fn();

    const { container } = render(
      <VideoStream
        stream={mockStream}
        username="testuser"
        onClick={handleClick}
      />
    );

    // Find the card element and click it
    const card = container.querySelector(".card");
    await user.click(card as HTMLElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
