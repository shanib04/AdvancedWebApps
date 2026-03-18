import { useState, useEffect } from "react";
import type { User } from "../../types/models";
import apiClient from "../../services/api-client";
import { getUserFriendlyApiError } from "../../utils/getUserFriendlyApiError";
import useAppToast from "../../hooks/useAppToast";
import {
  getStoredSessionUser,
  setStoredSessionUser,
} from "../../utils/sessionUser";

const BIO_MAX_LINES = 5;
const BIO_MAX_CHARS = 150;

interface BioSectionProps {
  user: User;
  isOwnProfile: boolean;
  onUserUpdate: (user: User) => void;
  onActionSuccess: (message: string) => void;
}

const clampBioToMaxLines = (value: string) =>
  value.split(/\r?\n/).slice(0, BIO_MAX_LINES).join("\n");

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

  useEffect(() => {
    if (!isEditing) {
      setEditingBio(user.bio || "");
    }
  }, [user.bio, isEditing]);

  const handleSaveBio = async () => {
    setIsSaving(true);

    try {
      const sanitizedBio = clampBioToMaxLines(editingBio).trim();
      const updateResponse = await apiClient.patch(`/user/${user._id}`, {
        bio: sanitizedBio,
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
    <div>
      {isOwnProfile && isEditing ? (
        // Edit mode
        <div className="d-flex flex-column gap-3">
          <textarea
            className="form-control rounded-2"
            placeholder="Tell others about yourself"
            value={editingBio}
            onChange={(e) =>
              setEditingBio(
                clampBioToMaxLines(e.target.value).slice(0, BIO_MAX_CHARS),
              )
            }
            rows={3}
            disabled={isSaving}
            style={{ resize: "none" }}
          />
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted fw-semibold">
              {editingBio.length}/{BIO_MAX_CHARS} characters
            </small>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-pill px-4"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-pill px-4 d-flex align-items-center gap-2"
                onClick={handleSaveBio}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm"
                      style={{ width: "14px", height: "14px" }}
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "16px" }}
                    >
                      check
                    </span>
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // View mode
        <div className="d-flex align-items-center" style={{ gap: "0" }}>
          {hasBio ? (
            <p
              className="mb-0 text-body"
              style={{
                lineHeight: "1.625",
                color: "#495057",
                fontSize: "0.95rem",
                whiteSpace: "pre-line",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {user.bio}
              {isOwnProfile && (
                <button
                  type="button"
                  className="btn btn-link text-primary"
                  onClick={() => setIsEditing(true)}
                  title="Edit bio"
                  style={{
                    textDecoration: "none",
                    padding: "0",
                    marginLeft: "0.25rem",
                    height: "auto",
                    lineHeight: "inherit",
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: "17px",
                      display: "inline-block",
                      lineHeight: "1",
                      verticalAlign: "middle",
                      transform: "translateY(-3px)",
                    }}
                  >
                    edit
                  </span>
                </button>
              )}
            </p>
          ) : isOwnProfile ? (
            <p
              className="mb-0 text-secondary fst-italic"
              style={{
                fontSize: "0.95rem",
                color: "#adb5bd",
                display: "flex",
                alignItems: "center",
              }}
            >
              Add a bio to tell people about yourself
              <button
                type="button"
                className="btn btn-link text-primary"
                onClick={() => setIsEditing(true)}
                title="Edit bio"
                style={{
                  textDecoration: "none",
                  padding: "0",
                  marginLeft: "0.25rem",
                  height: "auto",
                  lineHeight: "inherit",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "17px",
                    display: "inline-block",
                    lineHeight: "1",
                    verticalAlign: "middle",
                    transform: "translateY(-3px)",
                  }}
                >
                  edit
                </span>
              </button>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default BioSection;
