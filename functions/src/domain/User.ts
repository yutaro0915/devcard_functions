/**
 * User entity - represents a user in the system
 * This data is stored in /users/{userId} collection (private)
 */
export interface User {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
  githubAccessToken?: string;
  xAccessToken?: string;
  qiitaAccessToken?: string;
  customCss?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data required to create a new user
 */
export interface CreateUserData {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string;
}
