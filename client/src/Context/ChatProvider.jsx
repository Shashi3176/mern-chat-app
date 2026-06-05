import { useState, createContext, useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";

const ChatContext = createContext();

const ChatProvider = ({ children }) => {
  const [selectedChat, setSelectedChat] = useState();
  const [user, setUser] = useState();

  const history = useHistory();

  useEffect(() => {
    const userInfo = localStorage.getItem("userInfo");

    if (!userInfo) {
      history.push("/");
    } else {
      setUser(JSON.parse(userInfo));
    }
  }, [history]);

  return (
    <ChatContext.Provider
      value={{
        selectedChat,
        setSelectedChat,
        user,
        setUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const ChatState = () => useContext(ChatContext);

export default ChatProvider;
