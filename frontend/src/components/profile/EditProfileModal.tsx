import { useState, useRef, useEffect, useMemo } from "react";
import type { User } from "../../types/models";
import apiClient from "../../services/api-client";
import { defaultUserPhotoUrl, normalizePhotoUrl } from "../../utils/photoUtils";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import useAppToast from "../../hooks/useAppToast";
import AppToast from "../AppToast";
import {
  getStoredSessionUser,
  setStoredSessionUser,
} from "../../utils/sessionUser";
import { Trash2 } from "lucide-react";

const USERNAME_MAX_LENGTH = 15;
const DISPLAY_NAME_MAX_LENGTH = 20;

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
  const { toasts, removeToast, showFailed } = useAppToast();
  const [editingUsername, setEditingUsername] = useState(user.username);
  const [editingDisplayName, setEditingDisplayName] = useState(
    user.displayName || "",
  );
  const [editingPhotoUrl, setEditingPhotoUrl] = useState(
    user.photoUrl || defaultUserPhotoUrl,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
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
    return normalizePhotoUrl(editingPhotoUrl);
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
    setShowDeleteConfirmModal(false);
    onClose();
    resetForm();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/user/${user._id}`);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } catch (err: unknown) {
      showFailed(getUserFriendlyApiError(err, "Failed to delete account"));
      setDeleting(false);
      setShowDeleteConfirmModal(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        showFailed("Only PNG, JPG, JPEG, and WEBP formats are allowed.");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
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
        try {
          const formData = new FormData();
          formData.append("image", selectedFile);
          const uploadResponse = await apiClient.post("/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          photoUrl = uploadResponse.data?.imageUrl || editingPhotoUrl;
        } catch (uploadError: unknown) {
          showFailed(
            getUserFriendlyApiError(uploadError, "Failed to upload image."),
          );
          setSaving(false);
          return;
        }
      }

      const finalPhotoUrl = photoUrl || defaultUserPhotoUrl;

      const updateResponse = await apiClient.patch(`/user/${user._id}`, {
        username: editingUsername.trim(),
        displayName: editingDisplayName.trim(),
        photoUrl: finalPhotoUrl,
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
      <AppToast toasts={toasts} onClose={removeToast} />
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
                onChange={(e) => {
                  // Only allow alphanumeric characters, hyphens, and underscores, and convert to lowercase
                  const formattedValue = e.target.value
                    .replace(/[^a-zA-Z0-9\-_]/g, "")
                    .toLowerCase();
                  setEditingUsername(
                    formattedValue.slice(0, USERNAME_MAX_LENGTH),
                  );
                }}
                maxLength={USERNAME_MAX_LENGTH}
                disabled={saving}
              />
              <small className="text-muted d-block mt-2">
                {editingUsername.length}/{USERNAME_MAX_LENGTH} characters
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
                onChange={(e) =>
                  setEditingDisplayName(
                    e.target.value.slice(0, DISPLAY_NAME_MAX_LENGTH),
                  )
                }
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                disabled={saving}
              />
              <small className="text-muted d-block mt-2">
                How your name appears on your profile
              </small>
              <small className="text-muted d-block mt-1">
                {editingDisplayName.length}/{DISPLAY_NAME_MAX_LENGTH} characters
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
                  onError={(event) => {
                    const element = event.currentTarget;
                    if (element.src !== defaultUserPhotoUrl) {
                      element.src = defaultUserPhotoUrl;
                    }
                  }}
                />
                <div className="d-flex flex-column gap-2 flex-grow-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".png, .jpg, .jpeg, .webp, image/png, image/jpeg, image/webp"
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
                      setEditingPhotoUrl(defaultUserPhotoUrl);
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
          <div className="modal-footer border-top border-light-subtle py-4 px-5 d-flex justify-content-between align-items-center gap-3">
            <button
              type="button"
              className="btn btn-sm rounded-pill d-flex align-items-center justify-content-center btn-delete-profile"
              style={{
                width: "40px",
                height: "40px",
                border: "1px solid #e35d6a",
                color: "#c4374a",
                backgroundColor: "transparent",
              }}
              onClick={() => setShowDeleteConfirmModal(true)}
              disabled={saving || deleting}
              aria-label="Delete account"
              title="Delete account"
            >
              <Trash2 size={17} />
            </button>
            <div className="d-flex align-items-center gap-3">
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

      {showDeleteConfirmModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,0.35)", zIndex: 1060 }}
          onClick={() => !deleting && setShowDeleteConfirmModal(false)}
        >
          <div
            className="bg-white shadow-lg border border-light-subtle p-4"
            style={{ width: "min(420px, 92vw)", borderRadius: "1.75rem" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h6 className="fw-bold mb-2">
              Are you sure you want to delete your account?
            </h6>
            <p className="text-muted mb-4" style={{ fontSize: "0.92rem" }}>
              This action is permanent and cannot be undone.
            </p>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary rounded-pill px-3"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger rounded-pill px-3"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProfileModal;
