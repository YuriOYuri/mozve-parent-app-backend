import axios, { AxiosHeaders } from "axios";
import { userRepository } from "@repository";
import { HttpErrorException } from "@utils";

export const tiendanubeApiClient = axios.create({
  baseURL: process.env.TIENDANUBE_API_URL,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": `${process.env.CLIENT_ID} (${process.env.CLIENT_EMAIL})`,
  },
});

tiendanubeApiClient.interceptors.request.use(
  async (config) => {
    const userId = Number((config.url || "").split("/")[0]);

    if (!Number.isFinite(userId) || userId <= 0) {
      return config;
    }

    const { access_token } = await userRepository.findOne(userId);

    const headers =
      config.headers instanceof AxiosHeaders
        ? config.headers
        : new AxiosHeaders(config.headers);

    // Remove qualquer header anterior que possa conflitar
    headers.delete("Authorization");
    headers.delete("authorization");
    headers.delete("Authentication");

    // Header correto da Nuvemshop (confirmado via curl)
    headers.set("Authentication", `bearer ${access_token}`);
    config.headers = headers;

    return config;
  },
  function (error) {
    if (error.isAxiosError) {
      const { data } = error.response;
      const payload = new HttpErrorException(
        "TiendanubeApiClient - " + data?.message,
        data?.description
      );
      payload.setStatusCode(data?.code);
      return Promise.reject(payload);
    }

    return Promise.reject(error);
  }
);

tiendanubeApiClient.interceptors.response.use(
  (response) => {
    return response.data || {};
  },
  function (error) {
    if (error.isAxiosError) {
      const { data } = error.response;
      const payload = new HttpErrorException(
        "tiendanubeApiClient - " + data?.message,
        data?.description
      );
      payload.setStatusCode(data?.code);
      return Promise.reject(payload);
    }

    return Promise.reject(error);
  }
);
