import {
  FormControl,
  Input,
  Box,
  Text,
  Spinner,
  useToast,
  Badge,
  HStack,
} from "@chakra-ui/react";
import "./styles.css";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import ScrollableChat from "./ScrollableChat";
import { ChatState } from "../Context/ChatProvider";
import { RoomTimer, RoomParticipants } from "./miscellaneous/RoomComponents";

const SingleChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const toast = useToast();

  const { selectedChat, user, socket, joinRoom, sendTyping, sendStopTyping } = ChatState();

  const fetchMessages = useCallback(async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      let endpoint = `/api/message/${selectedChat._id}`;
      if (selectedChat.roomType === "group" || selectedChat.roomType === "direct") {
        endpoint = `/api/rooms/${selectedChat._id}/messages`;
      }

      const { data } = await axios.get(endpoint, config);
      setMessages(data);
      setLoading(false);

      joinRoom(selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occured!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  }, [selectedChat, user?.token, joinRoom, toast]);

  const sendMessage = async (event) => {
    if (event.key === "Enter" && newMessage) {
      sendStopTyping(selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        setNewMessage("");
        const payload = { content: newMessage };

        if (selectedChat.roomType === "group" || selectedChat.roomType === "direct") {
          payload.roomId = selectedChat._id;
        } else {
          payload.chatId = selectedChat._id;
        }

        const { data } = await axios.post("/api/message", payload, config);
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (error) {
        toast({
          title: "Error Occured!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  useEffect(() => {
    if (!socket || !user) return;

    socket.on("message recieved", (newMessageRecieved) => {
      setMessages((prev) => [...prev, newMessageRecieved]);
    });

    socket.on("user-typing", (data) => {
      if (data.roomId === selectedChat?._id) {
        setTyping(true);
        setTimeout(() => setTyping(false), 3000);
      }
    });

    return () => {
      socket.off("message recieved");
      socket.off("user-typing");
    };
  }, [socket, selectedChat?._id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const typingHandler = (e) => {
    setNewMessage(e.target.value);
    if (!typing) {
      sendTyping(selectedChat._id);
    }
  };

  const getRoomDisplayName = () => {
    if (selectedChat?.roomName) return selectedChat.roomName;
    if (selectedChat?.roomType === "direct") return "Random Chat";
    return "Group Chat";
  };

  return (
    <>
      {selectedChat ? (
        <>
          <HStack justify="space-between" w="100%">
            <Text
              fontSize={{ base: "20px", md: "24px" }}
              pb={3}
              px={2}
              fontFamily="Work sans"
            >
              {getRoomDisplayName()}
            </Text>
            {selectedChat?.expiresAt && <RoomTimer room={selectedChat} />}
          </HStack>

          {typing && (
            <Text fontSize="sm" color="gray.500" ml={2}>
              Someone is typing...
            </Text>
          )}

          <Box
            d="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat messages={messages} />
              </div>
            )}

            {selectedChat?.roomType === "group" && (
              <RoomParticipants roomId={selectedChat._id} />
            )}

            <FormControl
              onKeyDown={sendMessage}
              id="first-name"
              isRequired
              mt={3}
            >
              <Input
                variant="filled"
                bg="#E0E0E0"
                placeholder="Enter a message.."
                value={newMessage}
                onChange={typingHandler}
              />
            </FormControl>
          </Box>
        </>
      ) : (
        <Box d="flex" alignItems="center" justifyContent="center" h="100%">
          <Text fontSize="3xl" pb={3} fontFamily="Work sans">
            Select a chat to start messaging
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
