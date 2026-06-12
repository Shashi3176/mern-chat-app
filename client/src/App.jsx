import Homepage from "./Pages/Homepage.jsx";
import Chatpage from "./Pages/Chatpage.jsx";
import AdminLogin from "./components/Admin/AdminLogin.jsx";
import AdminModeration from "./components/Admin/AdminModeration.jsx";
import { Route } from "react-router-dom";

function App() {
  return (
    <div className="App">
      <Route path="/" component={Homepage} exact />
      <Route path="/chats" component={Chatpage} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/moderation" component={AdminModeration} />
    </div>
  );
}

export default App;
