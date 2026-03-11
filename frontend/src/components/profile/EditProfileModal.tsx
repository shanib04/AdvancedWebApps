import { useState, useRef, useEffect, useMemo } from "react";
import type { User } from "../../types/models";
import apiClient from "../../services/api-client";
import { defaultUserPhotoUrl } from "../../utils/photoUtils";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import useAppToast from "../../hooks/useAppToast";
import {
  getStoredSessionUser,
  setStoredSessionUser,
} from "../../utils/sessionUser";

interface EditProfileModalProps {
  user: User;
  isOwnProfile: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdate: (user: User) => void;
  onActionSuccess: (message: string) => void;
}

const EditProfileModal = ({
  user,
  isOwnProfile,
  isOpen,
  onClose,
  onUserUpdate,
  onActionSuccess,
}: EditProfileModalProps) => {
  const { showFailed } = useAppToast();
  const [editingUsername, setEditingUsername] = useState(user.username);
  const [editingDisplayName, setEditingDisplayName] = useState(
    user.displayName || "",
  );
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(user.photoUrl || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingUsername(user.username);
    setEditingDisplayName(user.displayName || "");
    setEditingPhotoUrl(user.photoUrl || "");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [user]);

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

  const resetForm = () => {
    setEditingUsername(user.username);
    setEditingDisplayName(user.displayName || "");
    setEditingPhotoUrl(user.photoUrl || "");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setEditingPhotoUrl(""); // Clear URL if file selected
    }
  };

  const handleSave = async () => {
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
          });
        }
      }

      onActionSuccess("Profile updated successfully.");
      onClose();
      resetForm();
    } catch (err: unknown) {
      showFailed(getUserFriendlyApiError(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
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
            <h5 className="modal-title fw-bold" style={{ fontSize: "1.25rem" }}>
              Edit Profile
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={handleClose}
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
              <label htmlFor="displayName" className="form-label fw-semibold">
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
              <label className="form-label fw-semibold">Profile Picture</label>
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
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary rounded-pill px-4 d-flex align-items-center gap-2"
              onClick={handleSave}
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
  );
};

export default EditProfileModal;
