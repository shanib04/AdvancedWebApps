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
        style={{ maxWidth: "450px" }}
      >
        <div
          className="modal-content border-0 shadow-lg rounded-3"
          style={{ backgroundColor: "#ffffff" }}
        >
          <div className="modal-header border-bottom border-light-subtle py-4 px-5">
            <h5 className="modal-title fw-bold" style={{ fontSize: "1.25rem" }}>
              Account Information
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body px-5 py-4">
            <div className="mb-4">
              <label className="form-label fw-semibold text-secondary small">
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "16px",
                    verticalAlign: "middle",
                    marginRight: "6px",
                  }}
                >
                  person
                </span>
                Username
              </label>
              <p className="mb-0 fw-semibold text-body">{user.username}</p>
            </div>

            {user.displayName && (
              <div className="mb-4">
                <label className="form-label fw-semibold text-secondary small">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "16px",
                      verticalAlign: "middle",
                      marginRight: "6px",
                    }}
                  >
                    badge
                  </span>
                  Display Name
                </label>
                <p className="mb-0 fw-semibold text-body">{user.displayName}</p>
              </div>
            )}

            {user.bio && (
              <div className="mb-4">
                <label className="form-label fw-semibold text-secondary small">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "16px",
                      verticalAlign: "middle",
                      marginRight: "6px",
                    }}
                  >
                    description
                  </span>
                  Bio
                </label>
                <p className="mb-0 text-body" style={{ lineHeight: "1.6" }}>
                  {user.bio}
                </p>
              </div>
            )}

            {user.email && (
              <div className="mb-4">
                <label className="form-label fw-semibold text-secondary small">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "16px",
                      verticalAlign: "middle",
                      marginRight: "6px",
                    }}
                  >
                    mail
                  </span>
                  Email
                </label>
                <p className="mb-0 text-body">{user.email}</p>
              </div>
            )}

            {user.createdAt && (
              <div className="mb-4">
                <label className="form-label fw-semibold text-secondary small">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "16px",
                      verticalAlign: "middle",
                      marginRight: "6px",
                    }}
                  >
                    calendar_today
                  </span>
                  Account Created
                </label>
                <p className="mb-0 text-secondary small">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            )}

            {user.updatedAt && (
              <div className="mb-0">
                <label className="form-label fw-semibold text-secondary small">
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "16px",
                      verticalAlign: "middle",
                      marginRight: "6px",
                    }}
                  >
                    update
                  </span>
                  Last Updated
                </label>
                <p className="mb-0 text-secondary small">
                  {formatDate(user.updatedAt)}
                </p>
              </div>
            )}
          </div>
          <div className="modal-footer border-top border-light-subtle py-4 px-5">
            <button
              type="button"
              className="btn btn-primary rounded-pill px-4 w-100"
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
