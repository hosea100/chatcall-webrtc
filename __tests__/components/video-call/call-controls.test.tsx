import { render, screen, fireEvent } from "@testing-library/react";
import { CallControls } from "@/components/video-call/call-controls";
import "@testing-library/jest-dom";

describe("CallControls Component", () => {
  const mockProps = {
    isMuted: false,
    isVideoOff: false,
    isConnected: true,
    isReconnecting: false,
    callStatus: "connected",
    onToggleMute: jest.fn(),
    onToggleVideo: jest.fn(),
    onRefreshVideo: jest.fn(),
    onReconnect: jest.fn(),
    onEndCall: jest.fn(),
  };

  it("renders all buttons", () => {
    render(<CallControls {...mockProps} />);

    // Check if all buttons are rendered
    expect(screen.getByTitle("Refresh Video")).toBeInTheDocument();

    // Check if the end call button is rendered
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(4); // Mute, Video, Refresh, End Call
  });

  it("calls onToggleMute when mute button is clicked", () => {
    render(<CallControls {...mockProps} />);

    // Find and click the mute button
    const muteButton = screen.getAllByRole("button")[0];
    fireEvent.click(muteButton);

    expect(mockProps.onToggleMute).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleVideo when video button is clicked", () => {
    render(<CallControls {...mockProps} />);

    // Find and click the video button
    const videoButton = screen.getAllByRole("button")[1];
    fireEvent.click(videoButton);

    expect(mockProps.onToggleVideo).toHaveBeenCalledTimes(1);
  });

  it("calls onEndCall when end call button is clicked", () => {
    render(<CallControls {...mockProps} />);

    // Find and click the end call button
    const endCallButton = screen.getAllByRole("button")[3];
    fireEvent.click(endCallButton);

    expect(mockProps.onEndCall).toHaveBeenCalledTimes(1);
  });

  it("shows reconnect button when call status is disconnected", () => {
    render(<CallControls {...mockProps} callStatus="disconnected" />);

    // Check if reconnect button is rendered
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(5); // Mute, Video, Refresh, Reconnect, End Call

    // Click the reconnect button
    fireEvent.click(buttons[3]);
    expect(mockProps.onReconnect).toHaveBeenCalledTimes(1);
  });
});
