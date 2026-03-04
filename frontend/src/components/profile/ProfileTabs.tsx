interface ProfileTabsProps {
  activeTab: "posts" | "liked" | "saved";
  onTabChange: (tab: "posts" | "liked" | "saved") => void;
  isOwnProfile: boolean;
}

const ProfileTabs = ({
  activeTab,
  onTabChange,
  isOwnProfile,
}: ProfileTabsProps) => {
  const tabs = [
    { key: "posts" as const, label: "My Posts" },
    ...(isOwnProfile
      ? [
          { key: "liked" as const, label: "Liked Posts" },
          { key: "saved" as const, label: "Saved Posts" },
        ]
      : []),
  ];

  return (
    <div className="d-flex border-bottom mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`btn border-0 rounded-0 flex-fill py-3 fw-semibold ${
            activeTab === tab.key
              ? "text-primary border-bottom border-primary border-3"
              : "text-muted"
          }`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ProfileTabs;
