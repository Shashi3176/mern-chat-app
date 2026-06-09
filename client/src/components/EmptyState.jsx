import { Box, Button, HStack, Icon, Text, VStack } from "@chakra-ui/react";
import { ChatIcon, RepeatIcon, SearchIcon } from "@chakra-ui/icons";

const EmptyState = ({ onBrowseRooms, onRandomChat }) => {
  return (
    <Box className="empty-state" h="100%" w="100%" display="flex" alignItems="center" justifyContent="center">
      <VStack className="empty-state-card" spacing={5} maxW="460px" px={6} py={8}>
        <Icon as={ChatIcon} className="empty-state-icon" />
        <Text className="empty-state-title">Welcome to Talk-A-Tive</Text>
        <Text className="empty-state-description">
          Choose a chat from the left panel, browse active rooms, or start a random anonymous conversation.
        </Text>

        <VStack align="stretch" spacing={2} w="100%">
          <HStack className="empty-state-instruction">
            <Icon as={SearchIcon} color="green.500" />
            <Text fontSize="sm" color="gray.600">
              Browse rooms to join group conversations.
            </Text>
          </HStack>
          <HStack className="empty-state-instruction">
            <Icon as={ChatIcon} color="blue.500" />
            <Text fontSize="sm" color="gray.600">
              Select a direct or group chat to start messaging.
            </Text>
          </HStack>
          <HStack className="empty-state-instruction">
            <Icon as={RepeatIcon} color="purple.500" />
            <Text fontSize="sm" color="gray.600">
              Start a random chat when you want a new anonymous partner.
            </Text>
          </HStack>
        </VStack>

        <HStack className="empty-state-buttons" spacing={3} justify="center" flexWrap="wrap">
          <Button
            leftIcon={<SearchIcon />}
            onClick={onBrowseRooms}
            colorScheme="green"
            variant="solid"
            className="empty-state-button"
          >
            Browse Rooms
          </Button>
          <Button
            leftIcon={<RepeatIcon />}
            onClick={onRandomChat}
            colorScheme="purple"
            variant="solid"
            className="empty-state-button"
          >
            Start Random Chat
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default EmptyState;
