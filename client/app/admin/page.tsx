
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";

type UserRole = string;

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface CustomRole {
  _id: string;
  name: string;
  description?: string;
  permissions?: string[];
  isActive: boolean;
}

interface Activity {
  _id: string;
  name?: string;
  email?: string;
  userId?: { name?: string; email?: string } | string;
  status?: string;
  action?: string;
  event?: string;
  device?: string;
  ipAddress?: string;
  failureReason?: string;
  createdAt?: string;
  timestamp?: string;
}

const builtInRoles = ["Student", "Mentor", "Administrator"];

const roleStyles: Record<string, string> = {
  Student: "bg-blue-100 text-blue-800",
  Mentor: "bg-purple-100 text-purple-800",
  Administrator: "bg-amber-100 text-amber-800",
};

export default function AdminPage() {
  const { user, isLoading, isLoggedIn, logout } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const [search, setSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);

    try {
      const { data } = await axiosInstance.get("/api/admin/users");
      setUsers(data.users ?? []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Unable to load users."
      );
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadCustomRoles = useCallback(async () => {
    setLoadingRoles(true);

    try {
      const { data } = await axiosInstance.get("/api/admin/roles");

      // Supports either an array or an object containing the roles.
      const roles: CustomRole[] = Array.isArray(data)
        ? data
        : data.roles ?? data.customRoles ?? [];

      // Only active custom roles can be assigned.
      setCustomRoles(
        roles.filter(
          (role) =>
            role.isActive === true &&
            !builtInRoles.includes(role.name)
        )
      );
    } catch (err: any) {
      console.error("Unable to load custom roles:", err);
      setError(
        err?.response?.data?.message ||
          "Unable to load custom roles. Check the admin roles API."
      );
      setCustomRoles([]);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);

    try {
      const { data } = await axiosInstance.get("/api/admin/activity");

      const list = Array.isArray(data)
        ? data
        : data.activities ?? data.history ?? data.activity ?? [];

      setActivities(list);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load platform activity."
      );
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn || user?.role !== "Administrator") {
      router.replace("/dashboard");
      return;
    }

    void loadUsers();
    void loadCustomRoles();
    void loadActivity();
  }, [
    isLoading,
    isLoggedIn,
    user,
    router,
    loadUsers,
    loadCustomRoles,
    loadActivity,
  ]);

  async function changeRole(userId: string, role: UserRole) {
    const previous = users.find((item) => item._id === userId);

    if (!previous || previous.role === role) return;

    setError("");
    setSuccess("");
    setUpdatingId(userId);

    try {
      const { data } = await axiosInstance.patch(
        `/api/admin/users/${userId}/role`,
        { role }
      );

      setUsers((old) =>
        old.map((item) =>
          item._id === userId
            ? { ...item, role: data.user?.role ?? role }
            : item
        )
      );

      setSuccess(
        data.message ||
          `Role updated successfully to ${role}. The user must log in again.`
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to update user role."
      );
    } finally {
      setUpdatingId("");
    }
  }

  const filteredUsers = users.filter((item) => {
    const query = search.toLowerCase().trim();

    return (
      item.name?.toLowerCase().includes(query) ||
      item.email?.toLowerCase().includes(query) ||
      item.role?.toLowerCase().includes(query)
    );
  });

  const filteredActivities = activities.filter((item) => {
    const account =
      typeof item.userId === "object" ? item.userId : undefined;

    const email = item.email ?? account?.email ?? "";
    const name = item.name ?? account?.name ?? "";
    const description =
      item.action ?? item.event ?? item.status ?? "";

    const query = activitySearch.toLowerCase().trim();

    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      (item.device ?? "").toLowerCase().includes(query)
    );
  });

  if (isLoading || !isLoggedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <p className="text-lg font-semibold">Loading account...</p>
      </main>
    );
  }

  if (user?.role !== "Administrator") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900">
        <section className="rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="mt-2 text-slate-600">
            Administrator permission is required.
          </p>
          <button
            onClick={() => router.replace("/dashboard")}
            className="mt-5 rounded-lg bg-blue-700 px-5 py-3 font-bold text-white"
          >
            Go to Dashboard
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              MockInterview AI
            </p>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Manage users, roles and platform activity.
            </p>
          </div>

          <button
            onClick={() => void logout()}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-50 p-4 text-red-800"
          >
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-4 rounded-xl bg-green-50 p-4 text-green-800"
          >
            {success}
          </div>
        )}

        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Users",
              value: users.length,
              color: "text-slate-900",
            },
            {
              label: "Students",
              value: users.filter((u) => u.role === "Student").length,
              color: "text-blue-700",
            },
            {
              label: "Mentors",
              value: users.filter((u) => u.role === "Mentor").length,
              color: "text-purple-700",
            },
            {
              label: "Administrators",
              value: users.filter((u) => u.role === "Administrator").length,
              color: "text-amber-700",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-500">
                {card.label}
              </p>
              <p
                className={`mt-2 text-4xl font-extrabold ${card.color}`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </section>

        {/* User Management */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
            <div>
              <h2 className="text-2xl font-bold">User Management</h2>
              <p className="mt-1 text-slate-600">
                Search accounts and update their assigned roles.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void loadUsers()}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold hover:bg-slate-50"
              >
                Refresh Users
              </button>

              <button
                onClick={() => void loadCustomRoles()}
                disabled={loadingRoles}
                className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {loadingRoles ? "Loading Roles..." : "Refresh Roles"}
              </button>
            </div>
          </div>

          <div className="p-6">
            <label
              htmlFor="user-search"
              className="mb-2 block text-sm font-bold"
            >
              Search users
            </label>
            <input
              id="user-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or role..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 sm:max-w-lg"
            />

            <p className="mt-3 text-sm text-slate-500">
              {loadingRoles
                ? "Loading available roles..."
                : `${builtInRoles.length} built-in role(s) and ${customRoles.length} active custom role(s) available.`}
            </p>
          </div>

          {loadingUsers ? (
            <p className="p-8 text-slate-600">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="p-8 text-slate-600">
              No matching users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Current Role</th>
                    <th className="px-6 py-4">Change Role</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((item) => (
                    <tr key={item._id} className="hover:bg-blue-50">
                      <td className="px-6 py-5 font-bold">
                        {item.name}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-700">
                        {item.email}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            roleStyles[item.role] ??
                            "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {item.role}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <select
                          aria-label={`Change role for ${item.name}`}
                          value={item.role}
                          disabled={
                            updatingId === item._id || loadingRoles
                          }
                          onChange={(e) =>
                            void changeRole(item._id, e.target.value)
                          }
                          className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-semibold text-slate-900 disabled:opacity-60"
                        >
                          {/* Preserve a current role if it was deactivated. */}
                          {!builtInRoles.includes(item.role) &&
                            !customRoles.some(
                              (role) => role.name === item.role
                            ) && (
                              <option value={item.role}>
                                {item.role} (inactive or unavailable)
                              </option>
                            )}

                          {builtInRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}

                          {customRoles.map((role) => (
                            <option key={role._id} value={role.name}>
                              {role.name}
                            </option>
                          ))}
                        </select>

                        {updatingId === item._id && (
                          <p className="mt-1 text-xs text-slate-500">
                            Saving...
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="border-t bg-slate-50 px-6 py-4 text-sm text-slate-600">
            Showing {filteredUsers.length} of {users.length} users
          </footer>
        </section>

        {/* Platform Activity Logs */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b p-6">
            <div>
              <h2 className="text-2xl font-bold">
                Platform Activity Logs
              </h2>
              <p className="mt-1 text-slate-600">
                Recent login activity and account events returned by the server.
              </p>
            </div>

            <button
              onClick={() => void loadActivity()}
              disabled={loadingActivity}
              className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {loadingActivity ? "Refreshing..." : "Refresh Activity"}
            </button>
          </div>

          <div className="p-6">
            <label
              htmlFor="activity-search"
              className="mb-2 block text-sm font-bold"
            >
              Search activity
            </label>
            <input
              id="activity-search"
              value={activitySearch}
              onChange={(e) => setActivitySearch(e.target.value)}
              placeholder="Search by email, event, status or device..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-200 sm:max-w-lg"
            />
          </div>

          {loadingActivity ? (
            <p className="p-8 text-slate-600">
              Loading platform activity...
            </p>
          ) : activities.length === 0 ? (
            <div className="p-8">
              <p className="font-semibold text-slate-800">
                No activity records returned.
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Check that the backend activity endpoint returns an activity list.
              </p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <p className="p-8 text-slate-600">
              No matching activity found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4">Activity / Status</th>
                    <th className="px-6 py-4">Device</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Timestamp</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredActivities.map((item) => {
                    const account =
                      typeof item.userId === "object"
                        ? item.userId
                        : undefined;

                    const timestamp = item.createdAt ?? item.timestamp;
                    const status =
                      item.status ??
                      item.action ??
                      item.event ??
                      "Activity";

                    return (
                      <tr
                        key={item._id}
                        className="align-top hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <p className="font-bold">
                            {item.name ??
                              account?.name ??
                              users.find(
                                (u) =>
                                  u.email ===
                                  (item.email ?? account?.email)
                              )?.name ??
                              "Unknown user"}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {item.email ??
                              account?.email ??
                              "Email unavailable"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              item.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : item.status === "success"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {status}
                          </span>

                          {item.failureReason && (
                            <p className="mt-2 max-w-xs text-sm text-red-700">
                              {item.failureReason}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-700">
                          {item.device ?? "Not recorded"}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-700">
                          {item.ipAddress ?? "Not recorded"}
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-700">
                          {timestamp
                            ? new Date(timestamp).toLocaleString()
                            : "Not recorded"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <footer className="border-t bg-slate-50 px-6 py-4 text-sm text-slate-600">
            Showing {filteredActivities.length} of {activities.length} activity records
          </footer>
        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          MockInterview AI · Administrator Control Panel
        </p>
      </div>
    </main>
  );
}
