import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import "../../styles/Organization.css";
import { appAlert } from "../../utils/appDialog";

type PageProps = {
  user?: {
    name?: string;
    email?: string;
  };
};

type TabKey = "welcome" | "email";

const PLACEHOLDER_HINT =
  "Placeholders: {{participantName}}, {{organizationName}}, {{odDates}}, {{loginUrl}}, {{loginId}}, {{password}}, {{responseDeadline}}, {{workshopName}}";

export default function ContentManagement({ user }: PageProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("welcome");
  const [loading, setLoading] = useState(true);
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const loadContent = async () => {
    try {
      setLoading(true);
      const [welcomeRes, emailRes] = await Promise.all([
        fetch("/api/get-welcome-content"),
        fetch("/api/get-workshop-email-template"),
      ]);
      const welcomeData = await welcomeRes.json();
      const emailData = await emailRes.json();

      if (welcomeData.success) {
        const paragraphs = Array.isArray(welcomeData.data?.paragraphs)
          ? welcomeData.data.paragraphs
          : [];
        setWelcomeText(paragraphs.join("\n\n"));
      }

      if (emailData.success && emailData.data?.subject && emailData.data?.body) {
        setEmailSubject(String(emailData.data.subject));
        setEmailBody(String(emailData.data.body));
      } else {
        // Fall back to defaults if API is empty / returned wrong shape.
        setEmailSubject(
          "Your Organisation Development Workshop with KNAV - Next Steps"
        );
        setEmailBody(
          [
            "Dear {{participantName}},",
            "",
            "Team KNAV is delighted to invite you to your Organisation Development Workshop on {{odDates}}.",
            "",
            "This workshop is designed as a collaborative space to review the current state of {{organizationName}} and co-create a roadmap for its growth and development. Together, we will explore key areas such as your vision and mission, growth strategy, processes, service offerings, market opportunities, and governance - with the aim of aligning today's actions with tomorrow's aspirations.",
            "",
            "Before the session, we would like to gather a well-rounded understanding of your business, including your perspectives on its future, as well as key facts about its financial position, market landscape, and overall operations. Please complete the Pre-Organisation Development Workshop Questionnaire on our Grow Your Business Platform using the details below:",
            "",
            "Website: {{loginUrl}}",
            "Login ID: {{loginId}}",
            "Password: {{password}}",
            "",
            "Kindly share your responses on the platform by {{responseDeadline}}.",
            "",
            "If you have any questions or need support, feel free to reach out directly to a Team KNAV member over email.",
            "",
            "We look forward to your inputs and to an engaging workshop ahead!",
            "",
            "Best regards,",
            "KNAV Advisory Team",
          ].join("\n")
        );
      }
    } catch (error) {
      console.error(error);
      await appAlert("Unable to load content settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContent();
  }, []);

  const saveWelcome = async () => {
    const paragraphs = welcomeText
      .split(/\n\s*\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      await appAlert("Add at least one welcome paragraph.");
      return;
    }

    try {
      setSavingWelcome(true);
      const response = await fetch("/api/update-welcome-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paragraphs,
          modifiedBy: user?.name || user?.email || "Admin",
        }),
      });
      const data = await response.json();
      if (!data.success) {
        await appAlert(data.message || "Failed to save welcome content.");
        return;
      }
      setWelcomeText(paragraphs.join("\n\n"));
      await appAlert(data.message || "Welcome content saved.");
    } catch (error) {
      console.error(error);
      await appAlert("Something went wrong while saving welcome content.");
    } finally {
      setSavingWelcome(false);
    }
  };

  const saveEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      await appAlert("Subject and email body are required.");
      return;
    }

    try {
      setSavingEmail(true);
      const response = await fetch("/api/update-workshop-email-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: emailSubject.trim(),
          body: emailBody.trim(),
          modifiedBy: user?.name || user?.email || "Admin",
        }),
      });
      const data = await response.json();
      if (!data.success) {
        await appAlert(data.message || "Failed to save email template.");
        return;
      }
      await appAlert(data.message || "Email template saved.");
    } catch (error) {
      console.error(error);
      await appAlert("Something went wrong while saving the email template.");
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="organization-layout">
      <Sidebar />
      <div className="organization-main">
        <Header user={user} />
        <div className="organization-content">
          <div className="org-page-header">
            <div>
              <h1 className="org-page-title">Welcome & Email Content</h1>
              <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
                Edit the participant welcome screen and the Pre-OD workshop
                email draft sent from the platform.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className={`org-btn ${
                activeTab === "welcome" ? "org-btn-primary" : "org-btn-cancel"
              }`}
              onClick={() => setActiveTab("welcome")}
            >
              Welcome screen
            </button>
            <button
              type="button"
              className={`org-btn ${
                activeTab === "email" ? "org-btn-primary" : "org-btn-cancel"
              }`}
              onClick={() => setActiveTab("email")}
            >
              Workshop email
            </button>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : activeTab === "welcome" ? (
            <div className="org-card">
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>
                Welcome screen paragraphs
              </h2>
              <p style={{ color: "#6b7280", marginTop: 0 }}>
                Separate paragraphs with a blank line. This content appears on
                the participant About / welcome page.
              </p>
              <textarea
                className="org-input"
                value={welcomeText}
                onChange={(event) => setWelcomeText(event.target.value)}
                rows={16}
                style={{
                  width: "100%",
                  minHeight: 280,
                  resize: "vertical",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="org-btn org-btn-primary"
                  onClick={() => void saveWelcome()}
                  disabled={savingWelcome}
                >
                  {savingWelcome ? "Saving..." : "Save welcome content"}
                </button>
              </div>
            </div>
          ) : (
            <div className="org-card">
              <h2 style={{ marginTop: 0, marginBottom: 8 }}>
                Pre-OD workshop email draft
              </h2>
              <p style={{ color: "#6b7280", marginTop: 0 }}>{PLACEHOLDER_HINT}</p>
              <label className="org-field-label">Subject</label>
              <input
                type="text"
                className="org-input"
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
              />
              <label className="org-field-label" style={{ marginTop: 12 }}>
                Body
              </label>
              <textarea
                className="org-input"
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value)}
                rows={18}
                style={{
                  width: "100%",
                  minHeight: 320,
                  resize: "vertical",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              />
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="org-btn org-btn-primary"
                  onClick={() => void saveEmail()}
                  disabled={savingEmail}
                >
                  {savingEmail ? "Saving..." : "Save email template"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
