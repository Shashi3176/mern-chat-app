import { Box, useBreakpointValue } from "@chakra-ui/react";
import ChatSidebar from "./ChatSidebar.jsx";
import ChatMain from "./ChatMain.jsx";
import { ChatNavigationProvider } from "../Context/ChatNavigationContext.jsx";
import "./ChatLayout.css";

const ChatContainer = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <ChatNavigationProvider>
      <Box
        className="chat-container"
        display="flex"
        h="100vh"
        maxH="100vh"
        overflow="hidden"
      >
        <ChatSidebar isMobile={isMobile} />
        <ChatMain isMobile={isMobile} />
      </Box>
    </ChatNavigationProvider>
  );
};

export default ChatContainer;