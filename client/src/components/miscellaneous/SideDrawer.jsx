import { Box, Button, Text, Badge, HStack, Spacer } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider";

function SideDrawer() {
  const history = useHistory();
  const { user } = ChatState();

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    history.push("/");
  };

  return (
    <Box
      d="flex"
      justifyContent="space-between"
      alignItems="center"
      bg="white"
      w="100%"
      p="5px 10px 5px 10px"
      borderWidth="5px"
    >
      <HStack spacing={4}>
        <Text fontSize="2xl" fontFamily="Work sans">
          Talk-A-Tive
        </Text>
        {user?.anonymousName && (
          <Badge colorScheme="purple" fontSize="md" p={1}>
            {user.anonymousName}
          </Badge>
        )}
      </HStack>
      <Spacer />
      <HStack>
        <Button onClick={() => history.push("/browse-rooms")} size="sm" colorScheme="blue">
          Browse Rooms
        </Button>
        <Button onClick={() => history.push("/random-chat")} size="sm" colorScheme="purple">
          Random Chat
        </Button>
        <Button onClick={logoutHandler} size="md">
          Logout
        </Button>
      </HStack>
    </Box>
  );
}

export default SideDrawer;
