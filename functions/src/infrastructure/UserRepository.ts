import {Firestore, FieldValue} from "firebase-admin/firestore";
import {IUserRepository} from "../domain/IUserRepository";
import {User, CreateUserData} from "../domain/User";

/**
 * Firestore implementation of IUserRepository
 * Handles data conversion between Firestore and Domain entities
 */
export class UserRepository implements IUserRepository {
  private collection = "users";

  constructor(private firestore: Firestore) {}

  async create(data: CreateUserData): Promise<User> {
    const now = new Date();
    const userData = {
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL || null,
      githubAccessToken: null,
      xAccessToken: null,
      qiitaAccessToken: null,
      customCss: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.firestore.collection(this.collection).doc(data.userId).set(userData);

    return this.toUser(userData);
  }

  async findById(userId: string): Promise<User | null> {
    const doc = await this.firestore.collection(this.collection).doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    return this.toUser(doc.data()!);
  }

  async update(userId: string, data: Partial<User>): Promise<void> {
    const updateData = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await this.firestore.collection(this.collection).doc(userId).update(updateData);
  }

  /**
   * Convert Firestore data to User entity
   */
  private toUser(data: any): User {
    return {
      userId: data.userId,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL || undefined,
      githubAccessToken: data.githubAccessToken || undefined,
      xAccessToken: data.xAccessToken || undefined,
      qiitaAccessToken: data.qiitaAccessToken || undefined,
      customCss: data.customCss || undefined,
      createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate(),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt.toDate(),
    };
  }
}
