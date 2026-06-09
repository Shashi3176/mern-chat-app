import { Box, Text } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider";

const NotificationToastItem = ({ notification }) => {
  const toastConfig = {
    match: { title: "Match found!", description: notification.message, status: "success" },
    "partner-left": { title: "Partner left", description: notification.message, status: "info" },
    "expiration-warning": { title: "Room expiring", description: notification.message, status: "warning" },
    "room-expired": { title: "Room expired", description: notification.message, status: "error" },
    message: { title: "New message", description: "You received a new message", status: "info" },
  };

  const config = toastConfig[notification.type] || { title: "Notification", description: "", status: "info" };

  return (
    <Box p={3} borderLeft="4px solid" borderColor={`${config.status}.500`} bg="white" borderRadius="md" boxShadow="md" maxW="sm">
      <Text fontWeight="semibold" fontSize="sm">{config.title}</Text>
      <Text fontSize="xs" color="gray.600">{config.description}</Text>
    </Box>
  );
};

export const NotificationCenter = () => {
  const { notifications, setNotifications } = ChatState();

  if (!notifications.length) return null;

  return (
    <Box position="fixed" bottom={4} right={4} zIndex="toast" display="flex" flexDirection="column" gap={2} pointerEvents="none">
      {notifications.slice(-5).reverse().map((n) => (
        <Box key={n.id || n._id || JSON.stringify(n)} pointerEvents="auto" maxW="340px" w="full" bg="whiteAlpha.900" borderRadius="md">
          <NotificationToastItem notification={n} />
          <Box
            as="button"
            onClick={() => setNotifications((prev) => prev.slice(1))}
            fontSize="xs"
            color="gray.400"
            p={1}
            pl={3}
            w="full"
            textAlign="right"
            cursor="pointer"
            _hover={{ color: "gray.600" }}
          >
            Dismiss
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default NotificationCenter;
