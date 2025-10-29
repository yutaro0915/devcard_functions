import {ICardRepository} from "../domain/ICardRepository";

/**
 * Input data for updating private card fields
 */
export interface UpdatePrivateCardInput {
  userId: string;
  email?: string;
  phoneNumber?: string;
  line?: string;
  discord?: string;
  x?: string;
  telegram?: string;
  slack?: string;
  otherContacts?: string;
}

/**
 * Use case for updating private contact information
 */
export class UpdatePrivateCardUseCase {
  constructor(private cardRepository: ICardRepository) {}

  async execute(input: UpdatePrivateCardInput): Promise<void> {
    const {userId, ...fields} = input;
    await this.cardRepository.update(userId, fields);
  }
}
