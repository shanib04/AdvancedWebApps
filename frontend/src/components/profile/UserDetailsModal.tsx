import type { User } from "../../types/models";
import { formatDateTimeLocal } from "../../utils/dateUtils";

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onEditOpen?: () => void;
}

const UserDetailsModal = ({
  user,
  isOpen,
  onClose,
  onEditOpen,
}: UserDetailsModalProps) => {
  if (!isOpen) return null;

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
                  {formatDateTimeLocal(user.createdAt, {
                    fallback: "Not available",
                  })}
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
                  {formatDateTimeLocal(user.updatedAt, {
                    fallback: "Not available",
                  })}
                </p>
              </div>
            )}
          </div>
          <div className="modal-footer border-top border-light-subtle py-4 px-5 d-flex gap-3">
            {onEditOpen && (
              <button
                type="button"
                className="btn btn-primary rounded-pill px-4 flex-grow-1 d-flex align-items-center justify-content-center gap-2"
                onClick={onEditOpen}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "18px" }}
                >
                  edit
                </span>
                Edit Profile
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-4 flex-grow-1"
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
