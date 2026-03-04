import { useState, useRef } from "react";
import type { User } from "../../types/models";
import apiClient from "../../services/api-client";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import useAppToast from "../../hooks/useAppToast";

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
      setShowEditModal(false);
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
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Profile</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">
                    Username
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={editingUsername}
                    onChange={(e) => setEditingUsername(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Profile Picture</label>
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Image URL"
                      value={editingPhotoUrl}
                      onChange={(e) => {
                        setEditingPhotoUrl(e.target.value);
                        setSelectedFile(null); // Clear file if URL entered
                      }}
                      disabled={!!selectedFile}
                    />
                    <span className="text-muted">or</span>
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!!editingPhotoUrl}
                    >
                      Upload File
                    </button>
                  </div>
                  {selectedFile && (
                    <small className="text-muted">
                      Selected: {selectedFile.name}
                    </small>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
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
