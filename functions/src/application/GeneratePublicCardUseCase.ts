import {IPublicCardRepository} from "../domain/IPublicCardRepository";
import {PublicCard} from "../domain/PublicCard";

/**
 * Input data for generating a public card
 */
export interface GeneratePublicCardInput {
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
}

/**
 * Use case for generating a public card from user data
 */
export class GeneratePublicCardUseCase {
  constructor(private publicCardRepository: IPublicCardRepository) {}

  async execute(input: GeneratePublicCardInput): Promise<PublicCard> {
    // Check if public card already exists
    const existingCard = await this.publicCardRepository.findByUserId(input.userId);
    if (existingCard) {
      throw new Error(`PublicCard for user ${input.userId} already exists`);
    }

    // Create new public card with default values
    const publicCard = await this.publicCardRepository.create({
      userId: input.userId,
      displayName: input.displayName,
      photoURL: input.photoURL,
      bio: input.bio,
      theme: "default",
    });

    return publicCard;
  }
}
