export type UserMenuItem = {
  label: string;
  path: string | null;
  match?: (pathname: string) => boolean;
};

export const workshopNavItems: UserMenuItem[] = [
  {
    label: "Home",
    path: "/userdashboard",
    match: (pathname) => pathname.startsWith("/userdashboard"),
  },
  {
    label: "Pre-Workshop Questionnaire",
    path: "/pre-od-workshop",
    match: (pathname) => pathname.startsWith("/pre-od-workshop"),
  },
  {
    label: "Vision And Mission Statement",
    path: "/vision-mission",
    match: (pathname) => pathname.startsWith("/vision-mission"),
  },
  {
    label: "Unlock Value",
    path: "/od-chart",
    match: (pathname) => pathname.startsWith("/od-chart"),
  },
  {
    label: "Actionables",
    path: "/actionables",
    match: (pathname) => pathname.startsWith("/actionables"),
  },
  {
    label: "Reports",
    path: "/reports",
    match: (pathname) => pathname.startsWith("/reports"),
  },
];

export type DashboardCard = {
  title: string;
  description: string;
  path: string | null;
};

export const dashboardCards: DashboardCard[] = [
  {
    title: "Pre-Workshop Questionnaire",
    description:
      "Complete this short questionnaire before the Organization Development Workshop begins.",
    path: "/pre-od-workshop",
  },
  {
    title: "Vision & Mission",
    description:
      "Aligning goals, purpose, and aspirations for the business.",
    path: "/vision-mission",
  },
  {
    title: "Unlock Value",
    description:
      "Foundational insights on the business model, operational efficiency and strategic outlook.",
    path: "/od-chart",
  },
  {
    title: "Actionables",
    description:
      "Track key priorities & takeaways from the Organization Development Workshop.",
    path: "/actionables",
  },
  {
    title: "Reports",
    description:
      "Summary of key insights, participant reflections & actionables.",
    path: "/reports",
  },
];
