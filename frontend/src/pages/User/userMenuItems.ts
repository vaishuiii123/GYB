export type UserMenuItem = {
  label: string;
  path: string | null;
  match?: (pathname: string) => boolean;
};

export const workshopNavItems: UserMenuItem[] = [
  {
    label: "Vision And Mission Statement",
    path: "/vision-mission",
    match: (pathname) => pathname.startsWith("/vision-mission"),
  },
  {
    label: "Questionnaire",
    path: "/od-chart",
    match: (pathname) => pathname.startsWith("/od-chart"),
  },
  {
    label: "List of Actionables",
    path: "/actionables",
    match: (pathname) => pathname.startsWith("/actionables"),
  },
  {
    label: "Workshop Feedback",
    path: null,
  },
];

export type DashboardCard = {
  title: string;
  description: string;
  path: string | null;
};

export const dashboardCards: DashboardCard[] = [
  {
    title: "Pre-Organization Development Workshop",
    description:
      "Setting context before the Organization Development Workshop.",
    path: null,
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
    path: null,
  },
];
