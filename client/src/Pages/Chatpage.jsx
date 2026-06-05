import { Box } from "@chakra-ui/react";
import Chatbox from "../components/Chatbox";
import SideDrawer from "../components/miscellaneous/SideDrawer";

const Chatpage = () => {
  return (
    <div style={{ width: "100%" }}>
      <SideDrawer />
      <Box d="flex" justifyContent="center" w="100%" h="91.5vh" p="10px">
        <Chatbox />
      </Box>
    </div>
  );
};

export default Chatpage;
