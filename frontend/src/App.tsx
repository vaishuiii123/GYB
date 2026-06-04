import { useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";
import Dashboard from "./pages/Admin/Dashboard";

function App() {

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/dashboard"
          element={<Dashboard/>}
        />
      </Routes>  
    </HashRouter>
  );
}

export default App;
