import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";
import { reconcileDisplayNameAfterSignup } from "./userProfile";

/**
 * Maps Firebase Auth error codes to one of `dict.auth.errors`' keys (see
 * `useTranslation()`), so the calling page can show a translated message in
 * the current language — this file has no React context to call `t()`
 * itself, so it only normalizes the code; translation happens at the UI layer.
 */
const AUTH_ERROR_KEYS: Record<string, string> = {
  "auth/email-already-in-use": "emailInUse",
  "auth/weak-password": "weakPassword",
  "auth/invalid-email": "invalidEmail",
  "auth/wrong-password": "wrongPassword",
  "auth/user-not-found": "userNotFound",
  "auth/invalid-credential": "invalidCredential",
  "auth/user-disabled": "userDisabled",
  "auth/too-many-requests": "tooManyRequests",
  "auth/popup-closed-by-user": "popupClosed",
  "auth/network-request-failed": "networkError",
};

/** Thrown by every function below instead of a raw Firebase error, so callers never need to know Firebase's error code format. */
export class AuthError extends Error {
  readonly translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.name = "AuthError";
    this.translationKey = translationKey;
  }
}

function toAuthError(error: unknown): AuthError {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
  return new AuthError((code && AUTH_ERROR_KEYS[code]) || "unknown");
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    // AuthContext's onAuthStateChanged-driven ensureUserDocument can fire
    // right after account creation but before this updateProfile() call
    // lands, creating the users/{uid} doc with a fallback displayName. Fix
    // it with a single-field updateDoc — never a full-document write here.
    await reconcileDisplayNameAfterSignup(credential.user.uid, name);
    return credential.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw toAuthError(error);
  }
}
