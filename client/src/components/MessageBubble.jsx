import { Avatar, Box, Flex, Text } from "@chakra-ui/react";
import { formatMessageTimestamp } from "../utils/messageUtils";

const MessageBubble = ({ message, isOwn, isGroup = false }) => {
  const senderName =
    message.sender?.anonymousName?.name ||
    message.sender?.name ||
    message.senderName ||
    "Anonymous";

  const timestamp = formatMessageTimestamp(message.createdAt);

  const showSenderName = isGroup && !isOwn;

  return (
    <Flex
      align="end"
      gap={2}
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

        <Box className="message-content-wrapper">
          <Text className="message-content">{message.content}</Text>
        </Box>

        {timestamp && (
          <Text
            as="span"
            className="message-timestamp"
            textAlign={isOwn ? "right" : "left"}
            width="100%"
            display="block"
          >
            {timestamp}
          </Text>
        )}
      </Box>
    </Flex>
  );
};

export default MessageBubble;
