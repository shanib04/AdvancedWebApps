export interface User {
  _id: string;
  username: string;
  email?: string;
  photoUrl?: string;
  displayName?: string;
  bio?: string;
  postsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Post {
  _id: string;
  content: string;
  imageUrl?: string;
  user?: User | string;
  likeCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  comments?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  _id: string;
  content: string;
  post: string;
  user?: User | string;
  parentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommentTreeItem extends Comment {
  replies: CommentTreeItem[];
}
