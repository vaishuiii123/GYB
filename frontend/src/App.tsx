import { lazy, Suspense, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AppDialogHost from "./components/AppDialogHost";
import { UnsavedChangesProvider } from "./utils/unsavedChanges";

const Dashboard = lazy(() => import("./pages/Admin/Dashboard"));
const AdminLogin = lazy(() => import("./pages/auth/AdminLogin"));
const Organization = lazy(() => import("./pages/Admin/Organization"));
const Participants = lazy(() => import("./pages/Admin/Participants"));
const Template = lazy(() => import("./pages/Admin/Template"));
const CreateTemplate = lazy(() => import("./pages/Admin/CreateTemplate"));
const CreatePreOdTemplate = lazy(() => import("./pages/Admin/CreatePreOdTemplate"));
const TemplateDetails = lazy(() => import("./pages/Admin/TemplateDetails"));
const PreODTemplateDetails = lazy(() => import("./pages/Admin/PreODTemplateDetails"));
const Workshop = lazy(() => import("./pages/Admin/Workshop"));
const CategoryManagement = lazy(() => import("./pages/Admin/CategoryManagement"));
const MiddleCategory = lazy(() => import("./pages/Admin/MiddleCategory"));
const ParentCategory = lazy(() => import("./pages/Admin/ParentCategory"));
const Category = lazy(() => import("./pages/Admin/Category"));
const CategoryQuestions = lazy(() => import("./pages/Admin/CategoryQuestions"));
const TagManagement = lazy(() => import("./pages/Admin/TagManagement"));
const QuestionManagement = lazy(() => import("./pages/Admin/QuestionManagement"));
const WorkshopResponses = lazy(() => import("./pages/Admin/WorkshopResponses"));
const AdminManagement = lazy(() => import("./pages/Admin/AdminManagement"));
const Export = lazy(() => import("./pages/Admin/Export"));

const UserLogin = lazy(() => import("./pages/User/UserLogin"));
const UserDashboard = lazy(() => import("./pages/User/UserDashboard"));
const WorkshopSelection = lazy(() => import("./pages/User/WorkshopSelection"));
const AboutUs = lazy(() => import("./pages/User/AboutUs"));
const VisionMission = lazy(() => import("./pages/User/VisionMission"));
const ODChart = lazy(() => import("./pages/User/ODChart"));
const ODChartQuestions = lazy(() => import("./pages/User/ODChartQuestions"));
const ActionableForm = lazy(() => import("./pages/User/ActionableForm"));
const PreODForm = lazy(() => import("./pages/User/PreODForm"));
const WorkshopFeedback = lazy(() => import("./pages/User/WorkshopFeedback"));
const Reports = lazy(() => import("./pages/User/Reports"));

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
      <UnsavedChangesProvider>
     <Suspense fallback={<div className="route-loading">Loading...</div>}>
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
      </Suspense>
      </UnsavedChangesProvider>
    </BrowserRouter>
  );
}

export default App;
