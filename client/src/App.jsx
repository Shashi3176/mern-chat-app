import Homepage from "./Pages/Homepage.jsx";
import Chatpage from "./Pages/Chatpage.jsx";
import { Route } from "react-router-dom";
import BrowseRooms from "./components/miscellaneous/BrowseRooms.jsx";
import RandomChat from "./components/miscellaneous/RandomChat.jsx";

function App() {
  return (
    <div className="App">
      <Route path="/" component={Homepage} exact />
      <Route path="/chats" component={Chatpage} />
      <Route path="/browse-rooms" component={BrowseRooms} />
      <Route path="/random-chat" component={RandomChat} />
    </div>
  );
}

export default App;
