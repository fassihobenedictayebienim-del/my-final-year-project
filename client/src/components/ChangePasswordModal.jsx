import { useState } from "react";
import { useToast } from "../context/ToastContext";
import api from "../services/api";
import { X } from "lucide-react";

export default function ChangePasswordModal({ onClose }) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New password and confirmation do not match.", "error");
      return;
    }
    try {
      setSubmitting(true);
      await api.put("/auth/change-password", { currentPassword, newPassword });
      showToast("Password changed successfully.");
      onClose();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to change password.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0, border: "none", padding: 0 }}>
            Change Password
          </h3>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close change-password dialog"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div style={{ width: "100%" }}>
              <label className="form-label">Current password</label>
              <input
                className="form-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-row">
            <div style={{ width: "100%" }}>
              <label className="form-label">New password</label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <div className="form-row">
            <div style={{ width: "100%" }}>
              <label className="form-label">Confirm new password</label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ width: "100%" }}
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%" }}
          >
            {submitting ? "Changing password…" : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
