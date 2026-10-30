import { useState, useEffect } from "react";
import { UsersRound } from "lucide-react";
import Layout from "../components/Layout";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function UserManagementPage() {
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState({ warehouses: [], stores: [] });
  const [loading, setLoading] = useState(true);
  const [showDeactivated, setShowDeactivated] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "store_manager",
    warehouse_id: "",
    store_id: "",
    new_location: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchUsers();
  }, [showDeactivated]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const [usersResponse, locationsResponse] = await Promise.all([
        api.get(`/users?include_deactivated=${showDeactivated}`),
        api.get("/locations"),
      ]);
      setUsers(usersResponse.data.users);
      setLocations(locationsResponse.data);
    } catch (_err) {
      showToast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      };
      if (formData.role === "warehouse_manager")
        payload.warehouse_id = formData.warehouse_id;
      if (formData.role === "store_manager")
        payload.store_id = formData.store_id;
      if (formData.new_location.trim())
        payload.new_location = formData.new_location.trim();

      await api.post("/auth/register", payload);
      showToast(`Account created for ${formData.name}.`);
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "store_manager",
        warehouse_id: "",
        store_id: "",
        new_location: "",
      });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to create account.",
        "error",
      );
    }
  }

  function startEdit(u) {
    setEditingId(u.user_id);
    setEditData({
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      role: u.role,
      warehouse_id: u.warehouse_id || "",
      store_id: u.store_id || "",
      new_location: "",
    });
  }

  async function handleSaveEdit(user_id) {
    try {
      const payload = {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        role: editData.role,
      };
      if (editData.role === "warehouse_manager")
        payload.warehouse_id = editData.warehouse_id;
      if (editData.role === "store_manager")
        payload.store_id = editData.store_id;
      if (editData.new_location.trim())
        payload.new_location = editData.new_location.trim();

      await api.put(`/users/${user_id}`, payload);
      showToast("User updated successfully.");
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update user.",
        "error",
      );
    }
  }

  async function handleDelete(user) {
    if (user.user_id === currentUser?.user_id) return;
    if (
      !window.confirm(
        `Delete ${user.name}'s account? Accounts with recorded activity are deactivated so audit history is retained.`,
      )
    )
      return;
    try {
      const response = await api.delete(`/users/${user.user_id}`);
      showToast(response.data.message);
      fetchUsers();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to delete user.",
        "error",
      );
    }
  }

  async function handleReactivate(user) {
    try {
      const response = await api.put(`/users/${user.user_id}/reactivate`);
      showToast(response.data.message);
      fetchUsers();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to reactivate user.",
        "error",
      );
    }
  }

  function roleLabel(role) {
    if (role === "administrator") return "Administrator";
    if (role === "warehouse_manager") return "Warehouse Manager";
    if (role === "store_manager") return "Store Manager";
    return role;
  }

  function roleBadge(role) {
    if (role === "administrator")
      return <span className="badge badge-fulfilled">{roleLabel(role)}</span>;
    if (role === "warehouse_manager")
      return <span className="badge badge-approved">{roleLabel(role)}</span>;
    return <span className="badge badge-pending">{roleLabel(role)}</span>;
  }

  function locationLabel(user) {
    if (user.warehouse_id) {
      return (
        locations.warehouses.find(
          (warehouse) =>
            String(warehouse.warehouse_id) === String(user.warehouse_id),
        )?.location || "—"
      );
    }
    if (user.store_id) {
      return (
        locations.stores.find(
          (store) => String(store.store_id) === String(user.store_id),
        )?.location || "—"
      );
    }
    return "—";
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Create and manage accounts across all roles.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : "+ Add New User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Full name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="name@moae.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Phone (optional)</label>
              <input
                className="form-input"
                type="tel"
                placeholder="e.g. 024 123 4567"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-row">
            <div style={{ flex: 1 }}>
              <label className="form-label">Temporary Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Min. 8 characters"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                style={{ width: "100%" }}
              >
                <option value="store_manager">Store Manager</option>
                <option value="warehouse_manager">Warehouse Manager</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
          </div>
          {formData.role === "warehouse_manager" && (
            <div className="form-row">
              <div>
                <label className="form-label">Warehouse Location</label>
                <select
                  className="form-input"
                  value={formData.warehouse_id}
                  onChange={(e) =>
                    setFormData({ ...formData, warehouse_id: e.target.value })
                  }
                >
                  <option value="">Select warehouse location</option>
                  {locations.warehouses.map((warehouse) => (
                    <option
                      key={warehouse.warehouse_id}
                      value={warehouse.warehouse_id}
                    >
                      {warehouse.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">
                  Or enter a warehouse location
                </label>
                <input
                  className="form-input"
                  placeholder="e.g. Ofankor"
                  value={formData.new_location}
                  onChange={(e) =>
                    setFormData({ ...formData, new_location: e.target.value })
                  }
                />
                <p className="form-hint">
                  Existing names are reused; a new name creates a location.
                </p>
              </div>
            </div>
          )}
          {formData.role === "store_manager" && (
            <div className="form-row">
              <div>
                <label className="form-label">Store Location</label>
                <select
                  className="form-input"
                  value={formData.store_id}
                  onChange={(e) =>
                    setFormData({ ...formData, store_id: e.target.value })
                  }
                >
                  <option value="">Select store location</option>
                  {locations.stores.map((store) => (
                    <option key={store.store_id} value={store.store_id}>
                      {store.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Or enter a store location</label>
                <input
                  className="form-input"
                  placeholder="e.g. Ofankor"
                  value={formData.new_location}
                  onChange={(e) =>
                    setFormData({ ...formData, new_location: e.target.value })
                  }
                />
                <p className="form-hint">
                  Existing names are reused; a new name creates a location.
                </p>
              </div>
            </div>
          )}
          <button type="submit" className="btn btn-primary">
            Create Account
          </button>
        </form>
      )}

      <label className="toggle-control">
        <input
          type="checkbox"
          checked={showDeactivated}
          onChange={(e) => setShowDeactivated(e.target.checked)}
        />{" "}
        Show deactivated users
      </label>

      {loading ? (
        <div className="loading-row">
          <span
            className="spinner"
            style={{
              borderTopColor: "var(--color-primary)",
              borderColor: "var(--color-border)",
            }}
          />{" "}
          Loading users...
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <UsersRound className="empty-state-icon" size={28} />
          No users yet.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-text">Name</th>
                <th className="col-text">Email</th>
                <th className="col-text">Phone</th>
                <th className="col-center">Role</th>
                <th className="col-text">Location</th>
                <th className="col-text">Created</th>
                <th className="col-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  {editingId === u.user_id ? (
                    <>
                      <td className="col-text">
                        <input
                          className="form-input"
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                          style={{ width: 110 }}
                        />
                      </td>
                      <td className="col-text">
                        <input
                          className="form-input"
                          value={editData.email}
                          onChange={(e) =>
                            setEditData({ ...editData, email: e.target.value })
                          }
                          style={{ width: 160 }}
                        />
                      </td>
                      <td className="col-text">
                        <input
                          className="form-input"
                          value={editData.phone}
                          onChange={(e) =>
                            setEditData({ ...editData, phone: e.target.value })
                          }
                          style={{ width: 120 }}
                          placeholder="Phone"
                        />
                      </td>
                      <td className="col-center">
                        <select
                          className="form-input"
                          value={editData.role}
                          onChange={(e) =>
                            setEditData({ ...editData, role: e.target.value })
                          }
                        >
                          <option value="store_manager">Store Manager</option>
                          <option value="warehouse_manager">
                            Warehouse Manager
                          </option>
                          <option value="administrator">Administrator</option>
                        </select>
                      </td>
                      <td className="col-text">
                        {editData.role === "warehouse_manager" && (
                          <>
                            <select
                              className="form-input"
                              value={editData.warehouse_id}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  warehouse_id: e.target.value,
                                  new_location: "",
                                })
                              }
                              style={{ width: 140 }}
                            >
                              <option value="">
                                Select warehouse location
                              </option>
                              {locations.warehouses.map((warehouse) => (
                                <option
                                  key={warehouse.warehouse_id}
                                  value={warehouse.warehouse_id}
                                >
                                  {warehouse.location}
                                </option>
                              ))}
                            </select>
                            <input
                              className="form-input"
                              placeholder="Enter new location"
                              value={editData.new_location}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  new_location: e.target.value,
                                  warehouse_id: "",
                                })
                              }
                              style={{ width: 150, marginTop: 6 }}
                            />
                          </>
                        )}
                        {editData.role === "store_manager" && (
                          <>
                            <select
                              className="form-input"
                              value={editData.store_id}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  store_id: e.target.value,
                                  new_location: "",
                                })
                              }
                              style={{ width: 140 }}
                            >
                              <option value="">Select store location</option>
                              {locations.stores.map((store) => (
                                <option
                                  key={store.store_id}
                                  value={store.store_id}
                                >
                                  {store.location}
                                </option>
                              ))}
                            </select>
                            <input
                              className="form-input"
                              placeholder="Enter new location"
                              value={editData.new_location}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  new_location: e.target.value,
                                  store_id: "",
                                })
                              }
                              style={{ width: 150, marginTop: 6 }}
                            />
                          </>
                        )}
                        {editData.role === "administrator" && (
                          <span style={{ color: "var(--color-text-muted)" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="col-text">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="col-center">
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => {
                              setEditingId(null);
                              setEditData(null);
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSaveEdit(u.user_id)}
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="col-text">{u.name}</td>
                      <td className="col-text">{u.email}</td>
                      <td className="col-text">{u.phone || "—"}</td>
                      <td className="col-center">
                        {roleBadge(u.role)}{" "}
                        {!u.active && (
                          <span className="badge badge-rejected">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="col-text">{locationLabel(u)}</td>
                      <td className="col-text">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="col-center">
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm"
                            onClick={() => startEdit(u)}
                            disabled={!u.active}
                          >
                            Edit
                          </button>
                          {u.active ? (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(u)}
                              disabled={
                                u.user_id === currentUser?.user_id ||
                                (u.role === "administrator" &&
                                  users.filter(
                                    (x) =>
                                      x.role === "administrator" && x.active,
                                  ).length <= 1)
                              }
                              title={
                                u.user_id === currentUser?.user_id
                                  ? "You cannot delete your own account."
                                  : u.role === "administrator" &&
                                      users.filter(
                                        (x) =>
                                          x.role === "administrator" &&
                                          x.active,
                                      ).length <= 1
                                    ? "The last remaining Administrator cannot be deleted."
                                    : `Delete ${u.name}`
                              }
                            >
                              Delete
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleReactivate(u)}
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
