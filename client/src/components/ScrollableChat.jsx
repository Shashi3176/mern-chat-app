import { Text, Box, Avatar, HStack } from "@chakra-ui/react";
import ScrollableFeed from "react-scrollable-feed";
import { ChatState } from "../Context/ChatProvider";

const ScrollableChat = ({ messages }) => {
  const { user } = ChatState();

  const getSenderName = (sender) => {
    if (!sender) return "Anonymous";
    if (sender.anonymousName?.name) return sender.anonymousName.name;
    if (sender.name) return sender.name;
    return "Anonymous";
  };

  const isOwnMessage = (senderId) => {
    return senderId === user?._id;
  };

  return (
    <ScrollableFeed>
      {messages &&
        messages.map((m, i) => (
          <div
            style={{
              display: "flex",
              justifyContent: isOwnMessage(m.sender?._id) ? "flex-end" : "flex-start",
            }}
            key={m._id}
          >
            <HStack
              style={{
                marginTop: i === 0 ? 3 : 10,
                maxWidth: "75%",
                alignSelf: "flex-start",
              }}
              spacing={2}
            >
              {!isOwnMessage(m.sender?._id) && (
                <Avatar size="sm" name={getSenderName(m.sender)} />
              )}
              <Box
                style={{
                  backgroundColor: isOwnMessage(m.sender?._id)
                    ? "#DCF8C6"
                    : "#E8E8E8",
                  borderRadius: "20px",
                  padding: "5px 15px",
                }}
              >
                <Text fontSize="xs" color="gray.500" mb={1}>
                  {getSenderName(m.sender)}
                </Text>
                <Text>{m.content}</Text>
              </Box>
            </HStack>
          </div>
        ))}
    </ScrollableFeed>
  );
};

export default ScrollableChat;
