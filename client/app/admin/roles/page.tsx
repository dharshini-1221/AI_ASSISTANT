
"use client";

import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import axiosInstance from "@/lib/axios";

type Role = {
  _id?: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  isActive?: boolean;
};

type RoleForm = {
  name: string;
  description: string;
  permissions: string;
};

const emptyForm: RoleForm = {
  name: "",
  description: "",
  permissions: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.get("/api/admin/roles");
      setRoles(response.data.roles ?? []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to load roles."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  function startEdit(role: Role) {
    if (!role._id || role.isSystem) return;

    setEditingId(role._id);
    setForm({
      name: role.name,
      description: role.description ?? "",
      permissions: (role.permissions ?? []).join(", "),
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const permissions = [
      ...new Set(
        form.permissions
          .split(",")
          .map((permission) => permission.trim())
          .filter(Boolean)
      ),
    ];

    if (form.name.trim().length < 2) {
      setError("Role name must contain at least 2 characters.");
      return;
    }

    if (permissions.includes("*")) {
      setError("Wildcard permission is not allowed.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        permissions,
      };

      if (editingId) {
        await axiosInstance.patch(
          `/api/admin/roles/${editingId}`,
          payload
        );
        setMessage("Role updated successfully.");
      } else {
        await axiosInstance.post("/api/admin/roles", payload);
        setMessage("Role created successfully.");
      }

      resetForm();
      await loadRoles();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to save role."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleRole(role: Role) {
    if (!role._id || role.isSystem) return;

    const activate = role.isActive === false;
    const action = activate ? "activate" : "deactivate";

    if (!window.confirm(`${action} the "${role.name}" role?`)) return;

    setError("");
    setMessage("");

    try {
      await axiosInstance.patch(`/api/admin/roles/${role._id}`, {
        isActive: activate,
      });

      setMessage(`Role ${action}d successfully.`);
      await loadRoles();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to update role."));
    }
  }

  async function deleteRole(role: Role) {
    if (!role._id || role.isSystem) return;

    if (
      !window.confirm(
        `Delete "${role.name}" permanently? This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await axiosInstance.delete(`/api/admin/roles/${role._id}`);

      setMessage("Role deleted successfully.");

      if (editingId === role._id) {
        resetForm();
      }

      await loadRoles();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to delete role."));
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    background: "#fff",
    color: "#111827",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 14px",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 28,
        background: "#f5f7fb",
        color: "#111827",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 6 }}>
          Custom Role Management
        </h1>
        <p style={{ color: "#6b7280", marginTop: 0 }}>
          Create roles and configure their permissions.
        </p>

        {error && (
          <p
            role="alert"
            style={{
              padding: 12,
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: 8,
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
              background: "#dcfce7",
              color: "#166534",
              borderRadius: 8,
            }}
          >
            {message}
          </p>
        )}

        <section
          style={{
            background: "#fff",
            padding: 22,
            borderRadius: 14,
            margin: "22px 0",
            border: "1px solid #e5e7eb",
          }}
        >
          <h2 style={{ fontSize: 19, marginTop: 0 }}>
            {editingId ? "Edit Custom Role" : "Create Custom Role"}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <label>
              <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                Role name
              </span>
              <input
                style={inputStyle}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Example: Content Reviewer"
                minLength={2}
                maxLength={50}
                required
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                Description
              </span>
              <input
                style={inputStyle}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Describe this role"
                maxLength={250}
              />
            </label>

            <label>
              <span style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                Permissions
              </span>
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: "vertical" }}
                value={form.permissions}
                onChange={(event) =>
                  setForm({ ...form, permissions: event.target.value })
                }
                placeholder="interviews:read_own, reports:read_own"
              />
              <small style={{ color: "#6b7280" }}>
                Separate permissions with commas.
              </small>
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  ...buttonStyle,
                  background: "#4f46e5",
                  color: "#fff",
                  opacity: saving ? 0.65 : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Role"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    ...buttonStyle,
                    background: "#e5e7eb",
                    color: "#111827",
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section
          style={{
            background: "#fff",
            padding: 22,
            borderRadius: 14,
            border: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ fontSize: 19, marginTop: 0 }}>Existing Roles</h2>
            <button
              type="button"
              onClick={() => void loadRoles()}
              style={{
                ...buttonStyle,
                background: "#e0e7ff",
                color: "#3730a3",
              }}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <p>Loading roles...</p>
          ) : roles.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No roles returned by the API.</p>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {roles.map((role, index) => (
                <article
                  key={role._id ?? role.name ?? index}
                  style={{
                    padding: 16,
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: "0 0 6px", fontSize: 17 }}>
                        {role.name}
                        {role.isSystem && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 11,
                              color: "#4338ca",
                              background: "#e0e7ff",
                              padding: "4px 7px",
                              borderRadius: 5,
                            }}
                          >
                            BUILT-IN
                          </span>
                        )}
                      </h3>

                      <p style={{ margin: "0 0 8px", color: "#6b7280" }}>
                        {role.description || "No description"}
                      </p>

                      <p style={{ margin: 0, fontSize: 13 }}>
                        <strong>Permissions:</strong>{" "}
                        {role.permissions?.join(", ") || "None"}
                      </p>

                      <p
                        style={{
                          margin: "8px 0 0",
                          fontSize: 13,
                          color:
                            role.isActive === false ? "#b91c1c" : "#15803d",
                        }}
                      >
                        {role.isActive === false ? "Inactive" : "Active"}
                      </p>
                    </div>

                    {!role.isSystem && role._id && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "start",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => startEdit(role)}
                          style={{
                            ...buttonStyle,
                            background: "#e0e7ff",
                            color: "#3730a3",
                          }}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void toggleRole(role)}
                          style={{
                            ...buttonStyle,
                            background: "#f3f4f6",
                            color: "#111827",
                          }}
                        >
                          {role.isActive === false ? "Activate" : "Deactivate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteRole(role)}
                          style={{
                            ...buttonStyle,
                            background: "#fee2e2",
                            color: "#991b1b",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
