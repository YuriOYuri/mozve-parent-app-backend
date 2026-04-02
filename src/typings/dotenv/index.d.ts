declare module "dotenv" {
  export interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
    debug?: boolean;
    override?: boolean;
  }

  export interface DotenvConfigOutput {
    parsed?: Record<string, string>;
    error?: Error;
  }

  export function config(options?: DotenvConfigOptions): DotenvConfigOutput;

  const dotenv: {
    config: typeof config;
  };

  export default dotenv;
}
