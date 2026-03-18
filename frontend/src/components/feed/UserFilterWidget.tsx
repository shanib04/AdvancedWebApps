import { useMemo } from "react";
import type { Post, User } from "../../types/models";
import { normalizePhotoUrl, defaultUserPhotoUrl } from "../../utils/photoUtils";

interface UserFilterWidgetProps {
  posts: Post[];
  title: string;
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
}

interface UserStat {
  userId: string;
  user: User;
  count: number;
}

export default function UserFilterWidget({
  posts,
  title,
  selectedUserIds,
  onToggleUser,
}: UserFilterWidgetProps) {
  // build per-user post counts from the visible posts list, sorted by most active
  const userStats = useMemo(() => {
    const statsMap = new Map<string, UserStat>();

    posts.forEach((post) => {
      if (
        typeof post.user === "object" &&
        post.user !== null &&
        post.user._id
      ) {
        const userId = post.user._id;
        if (!statsMap.has(userId)) {
          statsMap.set(userId, { userId, user: post.user, count: 0 });
        }
        statsMap.get(userId)!.count += 1;
      }
    });

    // Sort by count descending
    return Array.from(statsMap.values()).sort((a, b) => b.count - a.count);
  }, [posts]);

  if (userStats.length === 0) return null;

  return (
    <div className="card border-0 shadow-sm rounded-4 mb-4">
      <div className="card-body p-4">
        <h6 className="fw-bold mb-3">{title}</h6>
        <div className="d-flex flex-column gap-3">
          {userStats.map(({ userId, user, count }) => (
            <div
              key={userId}
              className="d-flex align-items-center justify-content-between"
            >
              <div className="d-flex align-items-center gap-2">
                <input
                  type="checkbox"
                  className="form-check-input mt-0"
                  checked={selectedUserIds.includes(userId)}
                  onChange={() => onToggleUser(userId)}
                  id={`filter-${userId}`}
                  style={{ cursor: "pointer" }}
                />
                <a
                  href={`/profile/${userId}`}
                  className="text-decoration-none text-dark d-flex align-items-center gap-2"
                >
                  <img
                    src={
                      normalizePhotoUrl(user.photoUrl) || defaultUserPhotoUrl
                    }
                    alt={user.displayName || user.username}
                    className="rounded-circle object-fit-cover bg-white"
                    width={32}
                    height={32}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(event) => {
                      const element = event.currentTarget;
                      if (element.src !== defaultUserPhotoUrl) {
                        element.src = defaultUserPhotoUrl;
                      }
                    }}
                  />
                  <div>
                    <div
                      className="fw-semibold small"
                      style={{ lineHeight: 1.2 }}
                    >
                      {user.displayName || user.username}
                    </div>
                    <div
                      className="text-muted small"
                      style={{ fontSize: "0.75rem", lineHeight: 1 }}
                    >
                      @{user.username}
                    </div>
                  </div>
                </a>
              </div>
              <span className="badge bg-light text-dark border rounded-pill">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
