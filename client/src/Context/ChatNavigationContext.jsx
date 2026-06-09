import { createContext, useContext, useState } from "react";

const ChatNavigationContext = createContext();

export const ChatNavigationProvider = ({ children }) => {
  const [activeSection, setActiveSection] = useState("myChats");
  const [isTabletSidebarOpen, setIsTabletSidebarOpen] = useState(true);

  return (
    <ChatNavigationContext.Provider
      value={{
        activeSection,
        setActiveSection,
        isTabletSidebarOpen,
        setIsTabletSidebarOpen,
      }}
    >
      {children}
    </ChatNavigationContext.Provider>
  );
};

export const useChatNavigation = () => {
  const context = useContext(ChatNavigationContext);
  if (!context) {
    throw new Error("useChatNavigation must be used within ChatNavigationProvider");
  }
  return context;
};

export default ChatNavigationContext;