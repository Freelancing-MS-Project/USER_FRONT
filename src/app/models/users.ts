export interface AppUser {
  readonly id: string | number;
  readonly username: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly enabled?: boolean;
  readonly roles?: readonly string[];
}
