import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../services/api-client";
import type { User, Post } from "../types/models";
import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/layout/LeftSidebar";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import ProfilePostGrid from "../components/profile/ProfilePostGrid";
import { getStoredSessionUser } from "../utils/sessionUser";
import { getUserFriendlyApiError } from "../utils/getUserFriendlyApiError";
import useAppToast from "../hooks/useAppToast";
import AppToast from "../components/shared/AppToast";

type ProfileTab = "posts" | "liked" | "saved";

type TabPostsState = Record<ProfileTab, Post[]>;
type TabLoadingState = Record<ProfileTab, boolean>;

const UserProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [postsByTab, setPostsByTab] = useState<TabPostsState>({
    posts: [],
    liked: [],
    saved: [],
  });
  const [loadingByTab, setLoadingByTab] = useState<TabLoadingState>({
    posts: false,
    liked: false,
    saved: false,
  });

  const { showSuccess, toasts, removeToast } = useAppToast();

  const currentUser = getStoredSessionUser();
  const currentUserId = currentUser?._id ?? "";
  const isOwnProfile = currentUserId === id;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [id]);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError("");
    setUser(null);

    // Reset tab data when moving to a different profile
    setPostsByTab({ posts: [], liked: [], saved: [] });
    setLoadingByTab({ posts: false, liked: false, saved: false });

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

    let isCancelled = false;

    const fetchPosts = async () => {
      setLoadingByTab((prev) => ({ ...prev, [activeTab]: true }));
      try {
        let endpoint = `/post?user=${id}`;
        if (activeTab === "liked") endpoint = `/post/user/${id}/liked`;
        else if (activeTab === "saved") endpoint = `/post/user/${id}/saved`;

        const response = await apiClient.get<Post[]>(endpoint);
        if (!isCancelled) {
          setPostsByTab((prev) => ({
            ...prev,
            [activeTab]: response.data || [],
          }));
        }
      } catch (err: unknown) {
        console.error("Failed to load posts:", err);
        if (!isCancelled) {
          setPostsByTab((prev) => ({ ...prev, [activeTab]: [] }));
        }
      } finally {
        if (!isCancelled) {
          setLoadingByTab((prev) => ({ ...prev, [activeTab]: false }));
        }
      }
    };

    fetchPosts();

    return () => {
      isCancelled = true;
    };
  }, [id, activeTab]);

  if (loading) {
    return (
      <main className="container-fluid min-vh-100 px-0 pb-4">
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
      <main className="container-fluid min-vh-100 px-0 pb-4">
        <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
        <div className="container mt-4">
          <div className="alert alert-danger">{error || "User not found."}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="container-fluid min-vh-100 px-0 pb-4">
      <AppToast toasts={toasts} onClose={removeToast} />
      <Navbar searchValue="" onSearchChange={() => {}} hideSearch={true} />
      <div className="container py-4">
        <div className="row g-4">
          <aside
            className="col-lg-3 d-none d-lg-block position-sticky"
            style={{ top: "85px", alignSelf: "start" }}
          >
            <LeftSidebar activePage={isOwnProfile ? "profile" : undefined} />
          </aside>
          <div className="col-12 col-lg-9">
            <ProfileHeader
              user={user}
              isOwnProfile={isOwnProfile}
              onUserUpdate={setUser}
              onActionSuccess={showSuccess}
            />
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isOwnProfile={isOwnProfile}
              userName={user.displayName || user.username}
            />
            <div style={{ minHeight: "400px" }}>
              <ProfilePostGrid
                key={activeTab}
                posts={postsByTab[activeTab]}
                loading={loadingByTab[activeTab]}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default UserProfilePage;
