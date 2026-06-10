import { Box, Text, HStack } from "@chakra-ui/react";
import { useEffect, useCallback, useRef } from "react";
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
    <Box
      p={3}
      borderLeft="4px solid"
      borderColor={`${config.status}.500`}
      bg="white"
      borderRadius="md"
      boxShadow="md"
      maxW="sm"
      className="notification-toast"
    >
      <HStack justify="space-between" align="start" gap={2}>
        <Box flex={1}>
          <Text fontWeight="semibold" fontSize="sm">{config.title}</Text>
          <Text fontSize="xs" color="gray.600">{config.description}</Text>
        </Box>
      </HStack>
    </Box>
  );
};

export const NotificationCenter = () => {
  const { notifications, setNotifications } = ChatState();
  const timerRefs = useRef({});

  const handleAutoDismiss = useCallback((id) => {
    delete timerRefs.current[id];
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isDismissing: true } : n))
    );
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 400);
  }, [setNotifications]);

  const handleManualDismiss = useCallback((id) => {
    if (timerRefs.current[id]) {
      clearTimeout(timerRefs.current[id]);
      delete timerRefs.current[id];
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isDismissing: true } : n))
    );
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 400);
  }, [setNotifications]);

  useEffect(() => {
    return () => {
      Object.values(timerRefs.current).forEach((id) => clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    if (!notifications.length) return;
    notifications.forEach((n) => {
      if (!timerRefs.current[n.id]) {
        const id = setTimeout(() => {
          handleAutoDismiss(n.id);
        }, 5000);
        timerRefs.current[n.id] = id;
      }
    });
  }, [notifications, handleAutoDismiss]);

  if (!notifications.length) return null;

  return (
    <Box position="fixed" bottom={4} right={4} zIndex="toast" display="flex" flexDirection="column" gap={2} pointerEvents="none">
      {notifications.slice(-5).reverse().map((n) => (
        <Box
          key={n.id || n._id || JSON.stringify(n)}
          pointerEvents="auto"
          maxW="340px"
          w="full"
          bg="whiteAlpha.900"
          borderRadius="md"
        >
          <NotificationToastItem notification={n} />
          <Box
            as="button"
            onClick={() => handleManualDismiss(n.id || n._id)}
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
