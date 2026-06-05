import { Box, Button, Text } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";

function SideDrawer() {
  const history = useHistory();

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
      <Text fontSize="2xl" fontFamily="Work sans">
        Talk-A-Tive
      </Text>
      <Button onClick={logoutHandler} size="md">
        Logout
      </Button>
    </Box>
  );
}

export default SideDrawer;
