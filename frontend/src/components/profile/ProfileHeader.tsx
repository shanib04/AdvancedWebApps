import { useState, useRef, useEffect, useMemo } from "react";
import type { User } from "../../types/models";
import apiClient from "../../services/api-client";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import useAppToast from "../../hooks/useAppToast";
import {
  getStoredSessionUser,
  setStoredSessionUser,
} from "../../utils/sessionUser";

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  onUserUpdate: (user: User) => void;
}

const ProfileHeader = ({
  user,
  isOwnProfile,
  onUserUpdate,
}: ProfileHeaderProps) => {
  const { showFailed } = useAppToast();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState(user.username);
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(user.photoUrl || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
          });
        }
      }

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
    <div className="text-center mb-4">
      <img
        src={normalizePhotoUrl(user.photoUrl)}
        alt={user.username}
        className="rounded-circle border shadow"
        style={{ width: "120px", height: "120px", objectFit: "cover" }}
        onError={(event) => {
          const element = event.currentTarget;
          if (element.src !== defaultUserPhotoUrl) {
            element.src = defaultUserPhotoUrl;
          }
        }}
      />
      <h3 className="fw-bold mt-3">{user.username}</h3>
      {isOwnProfile && (
        <button
          type="button"
          className="btn btn-outline-primary rounded-pill mt-3"
          onClick={() => setShowEditModal(true)}
        >
          Edit Profile
        </button>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            style={{ maxWidth: "350px" }}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Profile</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleModalClose}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3 text-center">
                  <label htmlFor="username" className="form-label">
                    Username
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={editingUsername}
                    onChange={(e) => setEditingUsername(e.target.value)}
                    style={{ maxWidth: "300px", margin: "0 auto" }}
                  />
                </div>
                <div className="mb-3 text-center">
                  <label className="form-label">Profile Picture</label>
                  <div className="d-flex align-items-start gap-4 justify-content-center">
                    {/* preview area */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="border"
                      style={{
                        width: "125px",
                        height: "125px",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />

                    {/* controls */}
                    <div>
                      <div className="d-flex flex-column gap-3 mb-2 mt-3 align-items-center">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="d-none"
                          onChange={handleFileSelect}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          style={{ width: "150px" }}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!!selectedFile}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          style={{ width: "150px" }}
                          onClick={() => {
                            setEditingPhotoUrl("");
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleModalClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  disabled={saving || !editingUsername.trim()}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileHeader;
