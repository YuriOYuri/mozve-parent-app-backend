import { userRepository } from "../../repository";
import { TiendanubeAuthInterface, LoginRequestInterface } from ".";

/**
 * In production mode, the back-end needs to implement its own authentication for the API.
 */
class AuthService {
  async login(
    loginRequest: LoginRequestInterface
  ): Promise<TiendanubeAuthInterface> {
    const userId = Number(loginRequest?.user_id);

    if (Number.isFinite(userId) && userId > 0) {
      return userRepository.findOne(userId);
    }

    return userRepository.findFirst();
  }
}

export default new AuthService();
