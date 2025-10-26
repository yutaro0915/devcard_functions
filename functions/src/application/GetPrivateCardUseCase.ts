import {IPrivateCardRepository} from "../domain/IPrivateCardRepository";
import {PrivateCard} from "../domain/PrivateCard";

/**
 * Use case for getting user's own private card
 */
export class GetPrivateCardUseCase {
  constructor(private privateCardRepository: IPrivateCardRepository) {}

  async execute(userId: string): Promise<PrivateCard | null> {
    return await this.privateCardRepository.findByUserId(userId);
  }
}
