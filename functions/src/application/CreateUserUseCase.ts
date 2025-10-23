import {IUserRepository} from "../domain/IUserRepository";
import {CreateUserData, User} from "../domain/User";

/**
 * Use case for creating a new user
 */
export class CreateUserUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(data: CreateUserData): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepository.findById(data.userId);
    if (existingUser) {
      throw new Error(`User with ID ${data.userId} already exists`);
    }

    // Create the user
    const user = await this.userRepository.create(data);

    return user;
  }
}
