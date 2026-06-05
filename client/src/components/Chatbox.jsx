import { Box } from "@chakra-ui/react";
import SingleChat from "./SingleChat";

const Chatbox = () => {
  return (
    <Box
      d="flex"
      alignItems="center"
      flexDir="column"
      p={3}
      bg="white"
      w="100%"
      borderRadius="lg"
      borderWidth="1px"
    >
      <SingleChat />
    </Box>
  );
};

export default Chatbox;
