import { Box, IconButton } from "@chakra-ui/react";
import { ChatState } from "../Context/ChatProvider.jsx";
import { useChatNavigation } from "../Context/ChatNavigationContext.jsx";
import SingleChat from "./SingleChat.jsx";
import EmptyChat from "./EmptyChat.jsx";
import { ArrowBackIcon } from "@chakra-ui/icons";

const ChatMain = ({ isMobile }) => {
  const { selectedChat, setSelectedChat } = ChatState();
  const { activeSection, setActiveSection } = useChatNavigation();

  const handleBack = () => {
    setSelectedChat(null);
    setActiveSection("myChats");
  };

  const showBackButton = isMobile && activeSection !== "myChats";

  return (
    <Box
      flex="1"
      display={{ base: isMobile ? "flex" : "none", md: "flex" }}
      h="100vh"
      bg="#f0f2f5"
      flexDirection="column"
      transition="transform 0.3s ease-in-out"
    >
      {showBackButton && (
        <Box p={2} bg="white" borderBottom="1px solid" borderColor="gray.200">
          <IconButton
            icon={<ArrowBackIcon />}
            aria-label="Back to chats"
            onClick={handleBack}
            variant="ghost"
          />
        </Box>
      )}
      <Box
        w="100%"
        h="100%"
        display="flex"
        flexDirection="column"
      >
        {selectedChat ? <SingleChat /> : <EmptyChat />}
      </Box>
    </Box>
  );
};

export default ChatMain;