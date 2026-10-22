
"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import axiosInstance from "@/lib/axios";

type Settings = {
  allowRegistration: boolean;
  maintenanceMode: boolean;
  requireEmailVerification: boolean;
  announcement: string;
  supportEmail: string;
};

const defaults: Settings = {
  allowRegistration: true,
  maintenanceMode: false,
  requireEmailVerification: true,
  announcement: "",
  supportEmail: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const response = await axiosInstance.get("/api/admin/settings");

        if (!cancelled) {
          setSettings({
            ...defaults,
            ...(response.data.settings ?? {}),
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Settings API is not available yet.")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await axiosInstance.patch(
        "/api/admin/settings",
        settings
      );

      setSettings({
        ...defaults,
        ...(response.data.settings ?? settings),
      });

      setMessage("Settings saved successfully.");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to save settings."));
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 11,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    boxSizing: "border-box",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
  };

  const toggleItems: {
    key: keyof Pick<
      Settings,
      "allowRegistration" | "maintenanceMode" | "requireEmailVerification"
    >;
    title: string;
    description: string;
  }[] = [
    {
      key: "allowRegistration",
      title: "Allow new registrations",
      description: "Configure whether new users may register.",
    },
    {
      key: "maintenanceMode",
      title: "Maintenance mode",
      description: "Save the platform maintenance-mode preference.",
    },
    {
      key: "requireEmailVerification",
      title: "Require email verification",
      description: "Save the email-verification policy preference.",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        color: "#111827",
        padding: 28,
      }}
    >
      <div style={{ maxWidth: 850, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>Platform Settings</h1>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Manage general platform configuration.
        </p>

        {error && (
          <p
            role="alert"
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#991b1b",
            }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#dcfce7",
              color: "#166534",
            }}
          >
            {message}
          </p>
        )}

        {loading ? (
          <p>Loading settings...</p>
        ) : (
          <form
            onSubmit={saveSettings}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 14,
              padding: 24,
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 19 }}>
              General Configuration
            </h2>

            <div style={{ display: "grid", gap: 18 }}>
              {toggleItems.map((item) => (
                <label
                  key={item.key}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={(event) =>
                      setSettings((previous) => ({
                        ...previous,
                        [item.key]: event.target.checked,
                      }))
                    }
                    style={{ width: 18, height: 18, marginTop: 3 }}
                  />

                  <span>
                    <strong>{item.title}</strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 13,
                        color: "#6b7280",
                      }}
                    >
                      {item.description}
                    </span>
                  </span>
                </label>
              ))}

              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  Platform Announcement
                </span>

                <textarea
                  style={{
                    ...inputStyle,
                    minHeight: 90,
                    resize: "vertical",
                  }}
                  maxLength={1000}
                  value={settings.announcement}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      announcement: event.target.value,
                    })
                  }
                  placeholder="Optional platform announcement"
                />
              </label>

              <label>
                <span
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  Support Email
                </span>

                <input
                  type="email"
                  style={inputStyle}
                  value={settings.supportEmail}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      supportEmail: event.target.value,
                    })
                  }
                  placeholder="support@example.com"
                  maxLength={254}
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "12px 16px",
                  border: 0,
                  borderRadius: 8,
                  background: "#4f46e5",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.65 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
