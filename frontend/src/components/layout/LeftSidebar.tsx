import { getStoredSessionUser } from "../../utils/sessionUser";
import { Bookmark, Heart, House, UserRound } from "lucide-react";

interface LeftSidebarProps {
  activePage?: "home" | "saved" | "liked" | "profile";
}

function LeftSidebar({ activePage }: LeftSidebarProps) {
  // read current user id from storage to build the profile link
  const currentUser = getStoredSessionUser();
  const currentUserId = currentUser?._id ?? "";

  return (
    <aside>
      <div className="list-group">
        <a
          href="/home"
          className={`list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold ${
            activePage === "home" ? "active" : ""
          }`}
        >
          <span className="d-inline-flex align-items-center gap-2">
            <House size={18} strokeWidth={2.1} />
            Home
          </span>
        </a>
        <a
          href="/home?saved=true"
          className={`list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold ${
            activePage === "saved" ? "active" : ""
          }`}
        >
          <span className="d-inline-flex align-items-center gap-2">
            <Bookmark size={18} strokeWidth={2.1} />
            Saved Posts
          </span>
        </a>
        <a
          href="/home?liked=true"
          className={`list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold ${
            activePage === "liked" ? "active" : ""
          }`}
        >
          <span className="d-inline-flex align-items-center gap-2">
            <Heart size={18} strokeWidth={2.1} />
            Liked Posts
          </span>
        </a>
        <a
          href={`/profile/${currentUserId}`}
          className={`list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold ${
            activePage === "profile" ? "active" : ""
          }`}
        >
          <span className="d-inline-flex align-items-center gap-2">
            <UserRound size={18} strokeWidth={2.1} />
            My Profile
          </span>
        </a>
      </div>
    </aside>
  );
}

export default LeftSidebar;
