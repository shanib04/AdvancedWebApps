import { getStoredSessionUser } from "../utils/sessionUser";

interface LeftSidebarProps {
  activePage?: "home" | "saved" | "profile";
}

function LeftSidebar({ activePage }: LeftSidebarProps) {
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
          🏠 Home
        </a>
        <a
          href="/home?saved=true"
          className={`list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold ${
            activePage === "saved" ? "active" : ""
          }`}
        >
          🔖 Saved Posts
        </a>
        <a
          href={`/profile/${currentUserId}`}
          className={`list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold ${
            activePage === "profile" ? "active" : ""
          }`}
        >
          👤 My Profile
        </a>
      </div>
    </aside>
  );
}

export default LeftSidebar;
