import type { Meta, StoryObj } from "@storybook/react";
import { UserList } from "@/components/user-list";

const meta: Meta<typeof UserList> = {
  title: "Components/UserList",
  component: UserList,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "600px", width: "400px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UserList>;

export const WithUsers: Story = {
  args: {
    users: {
      Alice: { online: true, socketId: "socket1" },
      Bob: { online: true, socketId: "socket2" },
      Charlie: { online: false, socketId: "socket3" },
      Dave: { online: true, socketId: "socket4" },
    },
  },
};

export const NoUsers: Story = {
  args: {
    users: {},
  },
};
