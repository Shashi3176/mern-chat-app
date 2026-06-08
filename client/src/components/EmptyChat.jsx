import { Box, VStack, Text, Icon, Button } from "@chakra-ui/react";
import { ChatIcon } from "@chakra-ui/icons";

const EmptyChat = () => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      h="100%"
      w="100%"
    >
      <VStack spacing={4} align="center" maxW="400px" px={4}>
        <Icon as={ChatIcon} w={20} h={20} color="gray.300" />
        <Text fontSize="2xl" color="gray.500" textAlign="center" fontFamily="Work sans">
          Select a chat to start messaging
        </Text>
        <Text fontSize="md" color="gray.400" textAlign="center">
          Choose from your existing chats or browse rooms to start a new conversation
        </Text>
        <Button colorScheme="blue" size="lg" mt={4}>
          Browse Rooms
        </Button>
      </VStack>
    </Box>
  );
};

export default EmptyChat;