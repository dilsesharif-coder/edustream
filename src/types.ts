export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  likesReceivedCount: number;
  fcmToken?: string;
}

export interface Video {
  id: string;
  uploaderUid: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  likesCount: number;
  category?: string;
  tags?: string[];
  rating?: number;
  createdAt: any;
  editData?: {
    trimStart: number;
    trimEnd: number;
    crop: string;
  };
}

export interface Document {
  id: string;
  uploaderUid: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  category?: string;
  tags?: string[];
  rating?: number;
  createdAt: any;
}

export interface Classroom {
  id: string;
  name: string;
  description: string;
  creatorUid: string;
  category?: string;
  tags?: string[];
  members: string[];
  createdAt: any;
}

export interface Message {
  id: string;
  classroomId: string;
  senderUid: string;
  text: string;
  createdAt: any;
}

export interface Notification {
  id: string;
  recipientUid: string;
  senderUid: string;
  senderName: string;
  senderPhotoURL?: string;
  type: 'follow' | 'like' | 'message';
  targetId: string; // videoId, classroomId, etc.
  targetTitle?: string;
  messagePreview?: string;
  read: boolean;
  createdAt: any;
}
