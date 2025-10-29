import {ICardRepository} from "../domain/ICardRepository";
import {PrivateContacts} from "../domain/Card";

/**
 * Input data for updating private card
 */
export interface UpdatePrivateCardInput {
  userId: string;
  privateContacts?: PrivateContacts;
}

/**
 * Use case for updating private card contact information
 */
export class UpdatePrivateCardUseCase {
  constructor(private cardRepository: ICardRepository) {}

  async execute(input: UpdatePrivateCardInput): Promise<void> {
    await this.cardRepository.update(input.userId, {
      privateContacts: input.privateContacts,
    });
  }
}
