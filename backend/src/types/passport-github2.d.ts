// Type definitions for passport-github2
declare module 'passport-github2' {
  import { Strategy as PassportStrategy } from 'passport';
  import { Request } from 'express';

  export interface Profile {
    id: string;
    username: string;
    displayName: string;
    emails?: Array<{ value: string; type?: string }>;
    photos?: Array<{ value: string }>;
    provider: string;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  export interface VerifyCallback {
    (error: Error | null, user?: any, info?: any): void;
  }

  export class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => void);
  }
}

