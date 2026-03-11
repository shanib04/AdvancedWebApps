import { useState, useEffect } from "react";
import type { User } from "../../types/models";
import apiClient from "../../services/api-client";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import useAppToast from "../../hooks/useAppToast";
import {
  getStoredSessionUser,
  setStoredSessionUser,
} from "../../utils/sessionUser";

interface BioSectionProps {
  user: User;
  isOwnProfile: boolean;
  onUserUpdate: (user: User) => void;
  onActionSuccess: (message: string) => void;
}

const BioSection = ({
  user,
  isOwnProfile,
  onUserUpdate,
  onActionSuccess,
}: BioSectionProps) => {
  const { showFailed } = useAppToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingBio, setEditingBio] = useState(user.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  // Sync editingBio when user prop changes and we're not editing
  useEffect(() => {
    if (!isEditing) {
      setEditingBio(user.bio || "");
    }
  }, [user.bio, isEditing]);

  const handleSaveBio = async () => {
    setIsSaving(true);

    try {
      const updateResponse = await apiClient.patch(`/user/${user._id}`, {
        bio: editingBio.trim() || undefined,
      });

      const updatedUser = updateResponse.data;
      onUserUpdate(updatedUser);

      if (isOwnProfile) {
        const currentSessionUser = getStoredSessionUser();
        if (currentSessionUser) {
          setStoredSessionUser({
            ...currentSessionUser,
            bio: updatedUser.bio,
          });
        }
      }

      onActionSuccess("Bio updated successfully.");
      setIsEditing(false);
    } catch (err: unknown) {
      showFailed(getUserFriendlyApiError(err, "Failed to update bio"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingBio(user.bio || "");
    setIsEditing(false);
  };

  const hasBio = !!user.bio;

  return (
    <div className="mb-4 text-center">
      {isOwnProfile && isEditing ? (
        // Edit mode
        <div>
          <textarea
            className="form-control"
            placeholder="Tell others about yourself"
            value={editingBio}
            onChange={(e) => setEditingBio(e.target.value.slice(0, 100))}
            rows={3}
            style={{ maxWidth: "400px", margin: "0 auto" }}
          />
          <small className="text-muted d-block mb-2">
            {editingBio.length}/100
          </small>
          <button
            type="button"
            className="btn btn-primary btn-sm me-2"
            onClick={handleSaveBio}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="d-inline-flex align-items-center gap-2">
                <span className="spinner-border spinner-border-sm" />
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
      ) : (
        // View mode
        <div className="d-flex justify-content-center align-items-center gap-2">
          {hasBio ? (
            <p className="text-muted mb-0">{user.bio}</p>
          ) : isOwnProfile ? (
            <p className="text-muted fst-italic mb-0">Add your bio</p>
          ) : null}
          {isOwnProfile && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm rounded-circle p-1"
              onClick={() => setIsEditing(true)}
              title="Edit bio"
              style={{
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px" }}
              >
                edit
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BioSection;
