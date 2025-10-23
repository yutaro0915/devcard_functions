import {User, CreateUserData} from "./User";

/**
 * User repository interface
 * Infrastructure layer will implement this interface
 */
export interface IUserRepository {
  /**
   * Create a new user
   */
  create(data: CreateUserData): Promise<User>;

  /**
   * Find a user by ID
   */
  findById(userId: string): Promise<User | null>;

  /**
   * Update a user
   */
  update(userId: string, data: Partial<User>): Promise<void>;
}
