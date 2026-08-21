import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AppDialogHost from "./components/AppDialogHost";
import Dashboard from "./pages/Admin/Dashboard";
import AdminLogin from "./pages/auth/AdminLogin";
import Organization from "./pages/Admin/Organization";
import Participants from "./pages/Admin/Participants";
import Template from "./pages/Admin/Template";
import CreateTemplate from "./pages/Admin/CreateTemplate";
import CreatePreOdTemplate from "./pages/Admin/CreatePreOdTemplate";
import TemplateDetails from "./pages/Admin/TemplateDetails";
import PreODTemplateDetails from "./pages/Admin/PreODTemplateDetails";
import Workshop from "./pages/Admin/Workshop";
import UserLogin from "./pages/User/UserLogin";
import UserDashboard from "./pages/User/UserDashboard";
import WorkshopSelection from "./pages/User/WorkshopSelection";
import AboutUs from "./pages/User/AboutUs";
import VisionMission from "./pages/User/VisionMission";
import ODChart from "./pages/User/ODChart";
import ODChartQuestions from "./pages/User/ODChartQuestions";
import ActionableForm from "./pages/User/ActionableForm";
import CategoryManagement from "./pages/Admin/CategoryManagement";
import MiddleCategory from "./pages/Admin/MiddleCategory";
import ParentCategory from "./pages/Admin/ParentCategory";
import Category from "./pages/Admin/Category";
import CategoryQuestions from "./pages/Admin/CategoryQuestions";
import TagManagement from "./pages/Admin/TagManagement";
import QuestionManagement from "./pages/Admin/QuestionManagement";
import WorkshopResponses from "./pages/Admin/WorkshopResponses";
import AdminManagement from "./pages/Admin/AdminManagement";
import PreODForm from "./pages/User/PreODForm";
import WorkshopFeedback from "./pages/User/WorkshopFeedback";
import Reports from "./pages/User/Reports";
import Export from "./pages/Admin/Export";

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
    <BrowserRouter>
      <AppDialogHost />
     <Routes>
        <Route
          path="/"
          element={<UserLogin />}
        />

        <Route
          path="/about-us"
          element={<AboutUs />}
        />

        <Route
          path="/select-workshop"
          element={<WorkshopSelection />}
        />

        <Route
          path="/userdashboard"
          element={<UserDashboard />}
        />

        <Route
          path="/od-chart"
          element={<ODChart />}
        />

        <Route
          path="/questionnaire"
          element={<Navigate to="/od-chart" replace />}
        />

        <Route
          path="/od-chart/questions"
          element={<ODChartQuestions />}
        />

        <Route
          path="/pre-od-workshop"
          element={<PreODForm />}
        />

        <Route
          path="/vision-mission"
          element={<VisionMission />}
        />

        <Route
          path="/actionables"
          element={<ActionableForm />}
        />

        <Route
          path="/workshop-feedback"
          element={<WorkshopFeedback />}
        />

        <Route
          path="/reports"
          element={<Reports />}
        />
        
        <Route
          path="/export"
          element={<Export user={currentUser} />}
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
          element={<CategoryManagement user={currentUser} />}
      />
      
      <Route
        path="/middle-category/:topCategoryId"
        element={<MiddleCategory user={currentUser}/>}
      />

      <Route
        path="/parent-category/:middleCategoryId"
        element={<ParentCategory user={currentUser}/>}
      />

      <Route
          path="/category/:parentCategoryId"
          element={<Category user={currentUser}/>}
      />

      <Route
          path="/category-questions/:categoryId"
          element={<CategoryQuestions user={currentUser}/>}
      />

      <Route 
          path="/tag-management" 
          element={<TagManagement user={currentUser}/>} 
      />

      <Route
        path="/question-management"
        element={<QuestionManagement user={currentUser} /> }
    />

      <Route
        path="/workshop-responses/:workshopId"
        element={<WorkshopResponses user={currentUser} />}
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
          path="/create-pre-od-template"
          element={<CreatePreOdTemplate user={currentUser} />}
        />

       <Route
          path="/template-details/:id"
          element={<TemplateDetails user={currentUser} />}
        />

       <Route
          path="/pre-od-template-details/:id"
          element={<PreODTemplateDetails user={currentUser} />}
        />

       <Route
          path="/workshop"
          element={<Workshop user={currentUser} />}
        />

       <Route
          path="/admin-management"
          element={<AdminManagement user={currentUser} />}
        />
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;
