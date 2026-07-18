export function NewsletterCard() {
  return (
    <div className="bg-brand-600 flex items-center justify-between gap-3 rounded-2xl p-4">
      <div>
        <h3 className="font-bold text-white">ติดตามข่าวสาร รวดเร็ว ทันใจ</h3>
        <p className="mt-1 text-sm text-white/85">
          หากต้องการรับข้อมูลข่าวสารทั้งหมดเราจะส่งตรงถึงคุณ
        </p>
      </div>
      <button
        type="button"
        className="text-brand-700 shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold"
      >
        ฉันต้องการ
      </button>
    </div>
  );
}
