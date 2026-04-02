import { tiendanubeAuthClient } from "../../config";
import { BadRequestException } from "../../utils";
import { userRepository } from "../../repository";
import {
  TiendanubeAuthRequest,
  TiendanubeAuthInterface,
} from ".";

class InstallAppService {
  public async install(code: string): Promise<TiendanubeAuthInterface> {
    if (!code) {
      throw new BadRequestException("The authorization code not found");
    }

    const body: TiendanubeAuthRequest = {
      client_id: process.env.CLIENT_ID as string,
      client_secret: process.env.CLIENT_SECRET as string,
      grant_type: "authorization_code",
      code: code,
    };

    const authenticateResponse = await this.authenticateApp(body);

    if (
      authenticateResponse.error &&
      authenticateResponse.error_description
    ) {
      throw new BadRequestException(
        authenticateResponse.error as string,
        authenticateResponse.error_description
      );
    }

    const { access_token, user_id } = authenticateResponse;

    if (!access_token || !user_id) {
      throw new BadRequestException(
        "Authentication response is missing store credentials"
      );
    }

    await userRepository.save(authenticateResponse);

    return authenticateResponse;
  }

  private async authenticateApp(
    body: TiendanubeAuthRequest
  ): Promise<TiendanubeAuthInterface> {
    return tiendanubeAuthClient.post("/", body);
  }
}

export default new InstallAppService();
