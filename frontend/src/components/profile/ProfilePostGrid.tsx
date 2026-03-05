import { Link } from "react-router-dom";
import type { Post } from "../../types/models";

interface ProfilePostGridProps {
  posts: Post[];
  loading: boolean;
}

const ProfilePostGrid = ({ posts, loading }: ProfilePostGridProps) => {
  if (loading) {
    return (
      <div className="row g-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="col-12 col-sm-6 col-md-4">
            <div
              className="bg-light rounded-4 overflow-hidden position-relative shimmer"
              style={{ aspectRatio: "1" }}
            ></div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">No posts to display.</p>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {posts.map((post) => (
        <div key={post._id} className="col-12 col-sm-6 col-md-4">
          <Link to={`/post/${post._id}`} className="text-decoration-none">
            <div
              className="bg-light rounded-4 overflow-hidden position-relative"
              style={{ aspectRatio: "1" }}
            >
              {post.imageUrl ? (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="w-100 h-100 object-fit-cover"
                />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 p-3">
                  <p className="text-muted text-center mb-0 small">
                    {post.content.length > 100
                      ? `${post.content.substring(0, 100)}...`
                      : post.content}
                  </p>
                </div>
              )}
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default ProfilePostGrid;
