import { useState } from "react";
import type { User } from "../../types/models";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";
import UserDetailsModal from "./UserDetailsModal";
import BioSection from "./BioSection";
import EditProfileModal from "./EditProfileModal";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  onUserUpdate: (user: User) => void;
  onActionSuccess: (message: string) => void;
}

const ProfileHeader = ({
  user,
  isOwnProfile,
  onUserUpdate,
  onActionSuccess,
}: ProfileHeaderProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  return (
    <>
      <div className="mb-4 d-flex justify-content-center">
        <div
          className="card border shadow-sm rounded-4"
          style={{
            backgroundColor: "#ffffff",
            borderColor: "#f0f0f0",
            maxWidth: "1024px",
            width: "100%",
          }}
        >
          <div className="card-body p-5 p-lg-6" style={{ padding: "3rem" }}>
            <div
              className="d-flex align-items-center justify-content-between"
              style={{ gap: "4rem" }}
            >
              <div
                className="d-flex align-items-center"
                style={{ gap: "4rem", flex: "1" }}
              >
                <div className="flex-shrink-0">
                  <img
                    src={normalizePhotoUrl(user.photoUrl)}
                    alt={user.username}
                    className="rounded-circle border shadow-lg"
                    style={{
                      width: "160px",
                      height: "160px",
                      objectFit: "cover",
                      borderWidth: "4px",
                      borderColor: "#ffffff",
                      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                    }}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(event) => {
                      const element = event.currentTarget;
                      if (element.src !== defaultUserPhotoUrl) {
                        element.src = defaultUserPhotoUrl;
                      }
                    }}
                  />
                </div>

                <div
                  className="d-flex flex-column"
                  style={{ gap: "0.75rem", flex: "1" }}
                >
                  <h2
                    className="fw-bold mb-0"
                    style={{ fontSize: "2rem", letterSpacing: "-0.5px" }}
                  >
                    {user.displayName || user.username}
                  </h2>

                  <div
                    className="d-flex"
                    style={{
                      color: "#6c757d",
                      fontSize: "0.95rem",
                      gap: "1.5rem",
                    }}
                  >
                    <div>
                      <span className="fw-bold text-dark">
                        {user.postsCount || 0}
                      </span>{" "}
                      Posts
                    </div>
                  </div>

                  <BioSection
                    user={user}
                    isOwnProfile={isOwnProfile}
                    onUserUpdate={onUserUpdate}
                    onActionSuccess={onActionSuccess}
                  />
                </div>
              </div>

              {isOwnProfile && (
                <div
                  className="d-flex flex-column flex-shrink-0"
                  style={{ gap: "0.75rem" }}
                >
                  <button
                    type="button"
                    className="btn btn-primary rounded-pill d-flex align-items-center justify-content-center"
                    onClick={() => setShowEditModal(true)}
                    style={{ minWidth: "140px", gap: "0.5rem" }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      edit
                    </span>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary rounded-pill d-flex align-items-center justify-content-center"
                    onClick={() => setShowDetailsModal(true)}
                    style={{ minWidth: "140px", gap: "0.5rem" }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "18px" }}
                    >
                      info
                    </span>
                    Details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditProfileModal
        user={user}
        isOwnProfile={isOwnProfile}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUserUpdate={onUserUpdate}
        onActionSuccess={onActionSuccess}
      />
      <UserDetailsModal
        user={user}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </>
  );
};

export default ProfileHeader;
