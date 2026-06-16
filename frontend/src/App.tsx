import { useState } from "react";
import {
  HashRouter,
  Routes,
  Route,
} from "react-router-dom";

import Dashboard from "./pages/Admin/Dashboard";
import AdminLogin from "./pages/auth/AdminLogin";
import Organization from "./pages/Admin/Organization";
import Participants from "./pages/Admin/Participants";
import Category from "./pages/Admin/Category";
import CategoryDetails from "./pages/Admin/CategoryDetails";
import SubCategoryDetails from "./pages/Admin/SubCategoryDetails";
import QuestionAssignment from "./pages/Admin/QuestionAssignment";
import Questions from "./pages/Admin/Questions";
import Template from "./pages/Admin/Template";
import CreateTemplate from "./pages/Admin/CreateTemplate";
import TemplateDetails from "./pages/Admin/TemplateDetails";
import Workshop from "./pages/Admin/Workshop";
import UserLogin from "./pages/User/UserLogin";
import UserDashboard from "./pages/User/UserDashboard";

function App() {

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const savedUser = localStorage.getItem("user");

    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData: any) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setCurrentUser(userData);
  };


  return (
    <HashRouter>
     <Routes>
        <Route
          path="/"
          element={<UserLogin />}
        />

        <Route
          path="/userdashboard"
          element={<UserDashboard />}
        />
       
       <Route
          path="/adminlogin"
          element={<AdminLogin onLogin={handleLogin} />}
        />
       
        <Route
          path="/dashboard"
          element={<Dashboard user={currentUser} />}
        />

       <Route
          path="/organization"
          element={<Organization user={currentUser} />}
        />

       <Route
          path="/category"
          element={<Category user={currentUser} />}
        />

       <Route
        path="/category/:masterCategoryId"
        element={<CategoryDetails user={currentUser} />}
      />

       <Route
        path="/subcategory/:categoryId"
        element={<SubCategoryDetails user={currentUser}/>}
      />

       <Route
          path="/questions-assignment/:subCategoryId"
          element={<QuestionAssignment user={currentUser}/>}
        />

       <Route
        path="/questions"
        element={<Questions user={currentUser} />}
      />

       <Route
          path="/participants"
          element={<Participants user={currentUser} />}
        />

        <Route
          path="/template"
          element={<Template user={currentUser} />}
        />

       <Route
          path="/create-template"
          element={<CreateTemplate user={currentUser} />}
        />

       <Route
          path="/template-details/:id"
          element={<TemplateDetails />}
        />

       <Route
          path="/workshop"
          element={<Workshop user={currentUser} />}
        />
       
      </Routes>
    </HashRouter>
  );
}

export default App;
