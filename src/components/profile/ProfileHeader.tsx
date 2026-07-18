import { BadgeCheck, MapPin, Pencil } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";

interface ProfileHeaderProps {
  displayName: string;
  email: string;
  photoURL?: string | null;
  guardianLevel: number;
  residentialArea: string;
  onLogout: () => void;
}

export function ProfileHeader({
  displayName,
  email,
  photoURL,
  guardianLevel,
  residentialArea,
  onLogout,
}: ProfileHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm">
      <div className="relative mx-auto w-fit">
        <UserAvatar photoURL={photoURL} displayName={displayName} size="lg" />
        <button
          type="button"
          aria-label="แก้ไขรูปโปรไฟล์"
          className="bg-brand-600 absolute right-0 bottom-0 rounded-full p-1.5 text-white shadow"
        >
          <Pencil size={13} />
        </button>
      </div>

      <h2 className="mt-3 text-xl font-bold text-gray-900">{displayName}</h2>
      <p className="text-sm text-gray-400">{email}</p>

      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
        <span className="bg-brand-600 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white">
          <BadgeCheck size={14} />
          ผู้พิทักษ์อากาศระดับ {guardianLevel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
          <MapPin size={14} />
          {residentialArea}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="bg-brand-600 hover:bg-brand-700 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
        >
          ตั้งค่าบัญชี
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
