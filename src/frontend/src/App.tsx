import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import ActivityPage from "./pages/Activity";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import ContactDetail from "./pages/ContactDetail";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";
import DealDetail from "./pages/DealDetail";
import Deals from "./pages/Deals";
import Login from "./pages/Login";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Tasks from "./pages/Tasks";

const rootRoute = createRootRoute({
  component: Root,
});

function Root() {
  const { identity, isInitializing } = useInternetIdentity();
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F4F6F9]">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    );
  }
  if (!identity) return <Login />;
  return <Layout />;
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: Dashboard,
});

const contactsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contacts",
  component: Contacts,
});

const contactDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/contacts/$id",
  component: ContactDetail,
});

const companiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/companies",
  component: Companies,
});

const companyDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/companies/$id",
  component: CompanyDetail,
});

const dealsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deals",
  component: Deals,
});

const dealDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deals/$id",
  component: DealDetail,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: Tasks,
});

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/activity",
  component: ActivityPage,
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: Reports,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: Settings,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  contactsRoute,
  contactDetailRoute,
  companiesRoute,
  companyDetailRoute,
  dealsRoute,
  dealDetailRoute,
  tasksRoute,
  activityRoute,
  reportsRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
