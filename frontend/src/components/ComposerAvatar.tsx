import { defaultUserPhotoUrl } from "../utils/photoUtils";

interface ComposerAvatarProps {
  photoUrl?: string;
  alt?: string;
}

function ComposerAvatar({
  photoUrl = defaultUserPhotoUrl,
  alt = "Your avatar",
}: ComposerAvatarProps) {
  return (
    <img
      src={photoUrl}
      alt={alt}
      className="avatar-soft shadow-sm bg-white"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      onError={(event) => {
        const element = event.currentTarget;
        if (element.src !== defaultUserPhotoUrl) {
          element.src = defaultUserPhotoUrl;
        }
      }}
    />
  );
}

export default ComposerAvatar;
