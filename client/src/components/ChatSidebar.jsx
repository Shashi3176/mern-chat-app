import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Icon,
} from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import { ChatIcon, SearchIcon, SettingsIcon } from "@chakra-ui/icons";
import { useChatNavigation } from "../Context/ChatNavigationContext.jsx";
import ChatList from "./ChatList/ChatList.jsx";
import BrowseRoomsSection from "./ChatList/BrowseRoomsSection.jsx";
import RandomChat from "./miscellaneous/RandomChat.jsx";

const ChatSidebar = ({ isMobile }) => {
  const { user } = ChatState();
  const { activeSection, setActiveSection } = useChatNavigation();
  const { setSelectedChat } = ChatState();

  return (
    <Box
      w={{ base: "100%", md: "32%" }}
      maxW={{ base: "100%", md: "380px" }}
      h="100vh"
      bg="white"
      borderRight="1px solid"
      borderColor="gray.200"
      display={{ base: isMobile && activeSection !== "myChats" ? "none" : "flex", md: "flex" }}
      flexDirection="column"
      transition="transform 0.3s ease-in-out"
      transform={{
        base: isMobile && activeSection !== "myChats" ? "translateX(-100%)" : "translateX(0)",
        md: "translateX(0)"
      }}
    >
      <Box p={4} borderBottom="1px solid" borderColor="gray.200">
        <HStack justify="space-between" align="center">
          <Text fontSize="2xl" fontFamily="Work sans" fontWeight="bold">
            Talk-A-Tive
          </Text>
          {user?.anonymousName && (
            <Badge colorScheme="purple" fontSize="sm" p={1}>
              {user.anonymousName}
            </Badge>
          )}
        </HStack>
      </Box>

      <VStack spacing={2} px={3} py={2}>
        <Button
          leftIcon={<ChatIcon />}
          variant={activeSection === "myChats" ? "solid" : "ghost"}
          colorScheme="blue"
          justifyContent="flex-start"
          w="100%"
          onClick={() => setActiveSection("myChats")}
        >
          My Chats
        </Button>
        <Button
          leftIcon={<SearchIcon />}
          variant={activeSection === "browseRooms" ? "solid" : "ghost"}
          colorScheme="blue"
          justifyContent="flex-start"
          w="100%"
          onClick={() => setActiveSection("browseRooms")}
        >
          Browse Rooms
        </Button>
        <Button
          leftIcon={<Icon as={SettingsIcon} />}
          variant={activeSection === "randomChat" ? "solid" : "ghost"}
          colorScheme="purple"
          justifyContent="flex-start"
          w="100%"
          onClick={() => setActiveSection("randomChat")}
        >
          Random Chat
        </Button>
      </VStack>

      <Box flex="1" overflowY="auto" px={3} className="chat-list-scroll">
        {activeSection === "myChats" && (
          <ChatList onChatSelect={(chat) => {
            setSelectedChat(chat);
            if (isMobile) {
              setActiveSection("chatView");
            }
          }} />
        )}
        {activeSection === "browseRooms" && <BrowseRoomsSection />}
        {activeSection === "randomChat" && <RandomChat />}
      </Box>

      <Box p={4} borderTop="1px solid" borderColor="gray.200">
        <Button
          leftIcon={<Icon as={SettingsIcon} />}
          variant="ghost"
          justifyContent="flex-start"
          w="100%"
          mb={2}
        >
          Settings
        </Button>
        <Button
          variant="ghost"
          colorScheme="red"
          justifyContent="flex-start"
          w="100%"
          onClick={() => {
            localStorage.removeItem("userInfo");
            window.location.href = "/";
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );
};

export default ChatSidebar;