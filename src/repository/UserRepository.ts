import { TiendanubeAuthInterface } from "@features/auth";
import { HttpErrorException } from "@utils";
import { CredentialDocument, getCredentialsCollection } from "../database";

class UserRepository {
  async save(credential: TiendanubeAuthInterface) {
    if (!credential.user_id) {
      throw new HttpErrorException("user_id não informado para salvar credenciais")
        .setStatusCode(400);
    }

    const collection = await getCredentialsCollection();
    const now = new Date();

    await collection.updateOne(
      { user_id: Number(credential.user_id) },
      {
        $set: {
          ...credential,
          user_id: Number(credential.user_id),
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true }
    );
  }

  async findOne(user_id: number) {
    const collection = await getCredentialsCollection();
    const store = await collection.findOne({ user_id: Number(user_id) });

    if (!store) {
      throw new HttpErrorException(
        "Read our documentation on how to authenticate your app"
      ).setStatusCode(404);
    }

    return this.toAuthInterface(store);
  }

  async findFirst(): Promise<TiendanubeAuthInterface> {
    const collection = await getCredentialsCollection();
    const store = await collection
      .find()
      .sort({ updated_at: -1, created_at: -1 })
      .limit(1)
      .next();

    if (!store) {
      throw new HttpErrorException(
        "Read our documentation on how to authenticate your app"
      ).setStatusCode(404);
    }

    return this.toAuthInterface(store);
  }

  private toAuthInterface(store: CredentialDocument): TiendanubeAuthInterface {
    return {
      access_token: store.access_token,
      token_type: store.token_type,
      scope: store.scope,
      user_id: store.user_id,
      error: store.error,
      error_description: store.error_description,
    };
  }
}

export default new UserRepository();
