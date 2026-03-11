import { useState, useRef, useEffect, useMemo } from "react";
import type { User } from "../../types/models";
import apiClient from "../../services/api-client";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import useAppToast from "../../hooks/useAppToast";
import UserDetailsModal from "./UserDetailsModal";
import BioSection from "./BioSection";
import {
  getStoredSessionUser,
  setStoredSessionUser,
} from "../../utils/sessionUser";

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
  const { showFailed } = useAppToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState(user.username);
  const [editingDisplayName, setEditingDisplayName] = useState(
    user.displayName || "",
  );
  const [editingBio, setEditingBio] = useState(user.bio || "");
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(user.photoUrl || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    setEditingUsername(user.username);
    setEditingDisplayName(user.displayName || "");
    setEditingBio(user.bio || "");
    setEditingPhotoUrl(user.photoUrl || "");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [user]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }
    return editingPhotoUrl || defaultUserPhotoUrl;
  }, [selectedFile, editingPhotoUrl]);

  // clean up object URL when file changes or component unmounts
  useEffect(() => {
    return () => {
      if (selectedFile && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, selectedFile]);

  const handleSaveProfile = async () => {
    if (!editingUsername.trim()) return;

    setSaving(true);
    try {
      let photoUrl = editingPhotoUrl;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);
        const uploadResponse = await apiClient.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        photoUrl =
          uploadResponse.data?.imageUrl ||
          uploadResponse.data?.photoUrl ||
          uploadResponse.data?.url ||
          editingPhotoUrl;
      }

      const updateResponse = await apiClient.patch(`/user/${user._id}`, {
        username: editingUsername.trim(),
        displayName: editingDisplayName.trim() || undefined,
        bio: editingBio.trim() || undefined,
        photoUrl: photoUrl,
      });

      const updatedUser = updateResponse.data;
      onUserUpdate(updatedUser);

      if (isOwnProfile) {
        const currentSessionUser = getStoredSessionUser();
        if (currentSessionUser) {
          setStoredSessionUser({
            ...currentSessionUser,
            username: updatedUser.username,
            photoUrl: updatedUser.photoUrl,
            displayName: updatedUser.displayName,
            bio: updatedUser.bio,
          });
        }
      }

      onActionSuccess("Profile updated successfully.");
      setShowEditModal(false);
      resetForm();
    } catch (err: unknown) {
      showFailed(getUserFriendlyApiError(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setEditingPhotoUrl(""); // Clear URL if file selected
    }
  };

  const resetForm = () => {
    setEditingUsername(user.username);
    setEditingDisplayName(user.displayName || "");
    setEditingBio(user.bio || "");
    setEditingPhotoUrl(user.photoUrl || "");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModalClose = () => {
    setShowEditModal(false);
    resetForm();
  };

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

      {showEditModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "500px" }}
          >
            <div
              className="modal-content border-0 shadow-lg rounded-3"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div className="modal-header border-bottom border-light-subtle py-4 px-5">
                <h5
                  className="modal-title fw-bold"
                  style={{ fontSize: "1.25rem" }}
                >
                  Edit Profile
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleModalClose}
                  disabled={saving}
                ></button>
              </div>
              <div className="modal-body px-5 py-4">
                <div className="mb-4">
                  <label htmlFor="username" className="form-label fw-semibold">
                    Username
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-2"
                    id="username"
                    value={editingUsername}
                    onChange={(e) =>
                      setEditingUsername(e.target.value.slice(0, 30))
                    }
                    disabled={saving}
                  />
                  <small className="text-muted d-block mt-2">
                    {editingUsername.length}/30 characters
                  </small>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="displayName"
                    className="form-label fw-semibold"
                  >
                    Display Name
                  </label>
                  <input
                    type="text"
                    className="form-control rounded-2"
                    id="displayName"
                    placeholder="Leave blank to use username"
                    value={editingDisplayName}
                    onChange={(e) => setEditingDisplayName(e.target.value)}
                    disabled={saving}
                  />
                  <small className="text-muted d-block mt-2">
                    How your name appears on your profile
                  </small>
                </div>

                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Profile Picture
                  </label>
                  <div className="d-flex align-items-center gap-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="rounded-circle border shadow-sm flex-shrink-0"
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "cover",
                        borderWidth: "3px",
                        borderColor: "#e9ecef",
                      }}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />

                    <div className="d-flex flex-column gap-2 flex-grow-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="d-none"
                        onChange={handleFileSelect}
                        disabled={saving}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm rounded-pill d-flex align-items-center justify-content-center gap-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving || !!selectedFile}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "18px" }}
                        >
                          photo_camera
                        </span>
                        Upload Photo
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm rounded-pill d-flex align-items-center justify-content-center gap-2"
                        onClick={() => {
                          setEditingPhotoUrl("");
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        disabled={saving}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "18px" }}
                        >
                          close
                        </span>
                        Clear Photo
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top border-light-subtle py-4 px-5 d-flex justify-content-end gap-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary rounded-pill px-4"
                  onClick={handleModalClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2"
                  onClick={handleSaveProfile}
                  disabled={saving || !editingUsername.trim()}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        style={{ width: "16px", height: "16px" }}
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "18px" }}
                      >
                        check
                      </span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <UserDetailsModal
        user={user}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
    </>
  );
};

export default ProfileHeader;
