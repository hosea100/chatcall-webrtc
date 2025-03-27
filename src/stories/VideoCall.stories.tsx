import type { Meta, StoryObj } from "@storybook/react";
import { VideoCall } from "@/components/video-call";
import { Provider } from "react-redux";
import { store } from "@/lib/redux/store";

const meta: Meta<typeof VideoCall> = {
  title: "Components/VideoCall",
  component: VideoCall,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <div style={{ height: "600px", width: "800px" }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof VideoCall>;

export const Default: Story = {
  args: {
    roomId: "test-room",
    username: "TestUser",
  },
};
