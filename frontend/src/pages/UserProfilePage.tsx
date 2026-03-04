import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../services/api-client";
import type { User, Post } from "../types/models";
import Navbar from "../components/Navbar";
import LeftSidebar from "../components/LeftSidebar";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import ProfilePostGrid from "../components/profile/ProfilePostGrid";
import { getStoredSessionUser } from "../utils/sessionUser";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";

const UserProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"posts" | "liked" | "saved">(
    "posts",
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const currentUser = getStoredSessionUser();
  const currentUserId = currentUser?._id ?? "";
  const isOwnProfile = currentUserId === id;

  useEffect(() => {
    if (!id) return;

    const fetchUser = async () => {
      try {
        const response = await apiClient.get<User>(`/user/${id}`);
        setUser(response.data);
        setError("");
      } catch (err: unknown) {
        setError(getUserFriendlyApiError(err, "Failed to load user profile"));
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchPosts = async () => {
      setPostsLoading(true);
      try {
        let endpoint = `/post?user=${id}`;
        if (activeTab === "liked") endpoint = `/post/user/${id}/liked`;
        else if (activeTab === "saved") endpoint = `/post/user/${id}/saved`;

        const response = await apiClient.get<Post[]>(endpoint);
        setPosts(response.data || []);
      } catch (err: unknown) {
        console.error("Failed to load posts:", err);
        setPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchPosts();
  }, [id, activeTab]);

  if (loading) {
    return (
      <main className="container-fluid feed-soft-bg min-vh-100 pb-4">
        <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
        <div className="container mt-4 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="container-fluid feed-soft-bg min-vh-100 pb-4">
        <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
        <div className="container mt-4">
          <div className="alert alert-danger">{error || "User not found."}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-fluid feed-soft-bg min-vh-100 pb-4">
      <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
      <div className="container py-4">
        <div className="row g-4">
          <aside
            className="col-lg-3 d-none d-lg-block position-sticky"
            style={{ top: "85px", alignSelf: "start" }}
          >
            <LeftSidebar activePage="profile" />
          </aside>
          <div className="col-12 col-lg-9">
            <ProfileHeader
              user={user}
              isOwnProfile={isOwnProfile}
              onUserUpdate={setUser}
            />
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isOwnProfile={isOwnProfile}
            />
            <ProfilePostGrid posts={posts} loading={postsLoading} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default UserProfilePage;
