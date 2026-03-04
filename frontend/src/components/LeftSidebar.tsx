import { getStoredSessionUser } from "../utils/sessionUser";

function LeftSidebar() {
  const currentUser = getStoredSessionUser();
  const currentUserId = currentUser?._id ?? "";

  return (
    <aside>
      <div className="list-group">
        <a
          href="/home"
          className="list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold"
        >
          🏠 Home
        </a>
        <a
          href="/home?saved=true"
          className="list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold"
        >
          🔖 Saved Posts
        </a>
        <a
          href={`/profile/${currentUserId}`}
          className="list-group-item list-group-item-action rounded-4 border-0 shadow-sm mb-2 py-3 fw-semibold"
        >
          👤 My Profile
        </a>
      </div>
    </aside>
  );
}

export default LeftSidebar;
