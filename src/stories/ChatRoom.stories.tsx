import type { Meta, StoryObj } from "@storybook/react";
import { ChatRoom } from "@/components/chat-room";
import { Provider } from "react-redux";
import { store } from "@/lib/redux/store";

const meta: Meta<typeof ChatRoom> = {
  title: "Components/ChatRoom",
  component: ChatRoom,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <Provider store={store}>
        <div style={{ height: "600px", width: "500px" }}>
          <Story />
        </div>
      </Provider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatRoom>;

export const Default: Story = {
  args: {
    messages: [
      { name: "Alice", content: "Hello there!" },
      { name: "Bob", content: "Hi Alice, how are you?" },
      { name: "Alice", content: "I'm doing great, thanks for asking!" },
    ],
    sendMessage: (content) => console.log("Message sent:", content),
    currentUser: "Bob",
  },
};

export const LongMessages: Story = {
  args: {
    messages: [
      { name: "Alice", content: "Hello there!" },
      {
        name: "Bob",
        content:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl. Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl.",
      },
      { name: "Alice", content: "Wow, that's a long message!" },
    ],
    sendMessage: (content) => console.log("Message sent:", content),
    currentUser: "Bob",
  },
};

export const EmptyChat: Story = {
  args: {
    messages: [],
    sendMessage: (content) => console.log("Message sent:", content),
    currentUser: "Bob",
  },
};
