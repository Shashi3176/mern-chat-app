import { Avatar, Box, HStack, Text } from "@chakra-ui/react";

const MessageBubble = ({ message, isOwn, isGroup = false }) => {
  const senderName =
    message.sender?.anonymousName?.name ||
    message.sender?.name ||
    message.senderName ||
    "Anonymous";

  const timestamp = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const showSenderName = isGroup && !isOwn;

  return (
    <HStack
      align="end"
      spacing={2}
      justify={isOwn ? "flex-end" : "flex-start"}
      className={isOwn ? "message-container own" : "message-container other"}
    >
      {!isOwn && showSenderName && (
        <Avatar
          name={senderName}
          size="sm"
          bg="teal.200"
          className="message-avatar"
        />
      )}

      <Box
        className={isOwn ? "message-bubble-own" : "message-bubble-other"}
        maxWidth={{ base: "82%", md: "68%" }}
        position="relative"
      >
        {showSenderName && (
          <Text fontSize="xs" fontWeight="bold" mb={1} className="message-sender-name">
            {senderName}
          </Text>
        )}

        <Text className="message-content">{message.content}</Text>

        {timestamp && (
          <Text as="span" className="message-timestamp">
            {timestamp}
          </Text>
        )}
      </Box>
    </HStack>
  );
};

export default MessageBubble;
