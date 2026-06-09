import { Box, useBreakpointValue } from "@chakra-ui/react";
import ChatSidebar from "./ChatSidebar.jsx";
import ChatMain from "./ChatMain.jsx";
import { ChatNavigationProvider } from "../Context/ChatNavigationContext.jsx";
import ChatProvider from "../Context/ChatProvider.jsx";
import { NotificationCenter } from "./NotificationCenter.jsx";
import "./ChatLayout.css";

const ChatContainer = () => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false });

  return (
    <ChatProvider>
      <ChatNavigationProvider>
        <Box
          className="chat-container"
          display="flex"
          h="100vh"
          maxH="100vh"
          overflow="hidden"
        >
          <ChatSidebar isMobile={isMobile} isTablet={isTablet} />
          <ChatMain isMobile={isMobile} isTablet={isTablet} />
        </Box>
        <NotificationCenter />
      </ChatNavigationProvider>
    </ChatProvider>
  );
};

export default ChatContainer;
