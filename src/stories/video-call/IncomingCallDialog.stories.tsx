import type { Meta, StoryObj } from "@storybook/react";
import { IncomingCallDialog } from "@/components/video-call/incoming-call-dialog";

const meta: Meta<typeof IncomingCallDialog> = {
  title: "VideoCall/IncomingCallDialog",
  component: IncomingCallDialog,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    open: { control: "boolean" },
    callerName: { control: "text" },
    onAccept: { action: "accepted" },
    onReject: { action: "rejected" },
    onOpenChange: { action: "openChanged" },
  },
};

export default meta;
type Story = StoryObj<typeof IncomingCallDialog>;

export const Open: Story = {
  args: {
    open: true,
    callerName: "Alice",
  },
};

export const Closed: Story = {
  args: {
    open: false,
    callerName: "Bob",
  },
};
