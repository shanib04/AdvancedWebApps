import type { User } from "../../types/models";

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

const UserDetailsModal = ({ user, isOpen, onClose }: UserDetailsModalProps) => {
  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: "400px" }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">User Details</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div className="mb-3">
              <label className="form-label text-muted small fw-bold">
                Username
              </label>
              <p>{user.username}</p>
            </div>
            {user.displayName && (
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">
                  Display Name
                </label>
                <p>{user.displayName}</p>
              </div>
            )}
            {user.bio && (
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">
                  Bio
                </label>
                <p>{user.bio}</p>
              </div>
            )}
            {user.email && (
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">
                  Email
                </label>
                <p>{user.email}</p>
              </div>
            )}
            {user.createdAt && (
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">
                  Account Created
                </label>
                <p>{formatDate(user.createdAt)}</p>
              </div>
            )}
            {user.updatedAt && (
              <div className="mb-3">
                <label className="form-label text-muted small fw-bold">
                  Last Updated
                </label>
                <p>{formatDate(user.updatedAt)}</p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
