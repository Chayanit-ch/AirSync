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

/** Maps Firebase Auth error codes to user-friendly Thai messages. Never surface raw Firebase codes to users. */
const AUTH_ERROR_MESSAGES_TH: Record<string, string> = {
  "auth/email-already-in-use": "อีเมลนี้ถูกใช้งานแล้ว",
  "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
  "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
  "auth/wrong-password": "รหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบผู้ใช้งานด้วยอีเมลนี้",
  "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "auth/user-disabled": "บัญชีผู้ใช้นี้ถูกระงับการใช้งาน",
  "auth/too-many-requests": "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
  "auth/popup-closed-by-user": "หน้าต่างเข้าสู่ระบบถูกปิดก่อนดำเนินการเสร็จสิ้น",
  "auth/network-request-failed": "เกิดปัญหาการเชื่อมต่อเครือข่าย กรุณาลองใหม่อีกครั้ง",
};

function toThaiAuthError(error: unknown): Error {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
  const message = (code && AUTH_ERROR_MESSAGES_TH[code]) || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  return new Error(message);
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
    throw toThaiAuthError(error);
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
    throw toThaiAuthError(error);
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  } catch (error) {
    throw toThaiAuthError(error);
  }
}

export async function logOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw toThaiAuthError(error);
  }
}
