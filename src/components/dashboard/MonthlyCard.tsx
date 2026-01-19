import Card from "./Card";

export default function MonthlyCard() {
  return (
    <Card className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 text-white shadow-xl shadow-violet-500/30 animate-[fade-up_0.9s_ease-out]">
      <p className="text-sm text-violet-100">Records delivered</p>
      <p className="mt-3 font-display text-3xl font-semibold">3,240</p>
      <p className="mt-1 text-sm text-violet-100">Rows this month</p>
      <div className="mt-6 h-20 w-full">
        <svg className="h-full w-full" viewBox="0 0 240 80">
          <path
            d="M0 60 C30 20, 60 90, 90 50 C120 10, 150 70, 180 40 C200 25, 220 65, 240 30"
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="mt-4 flex justify-between text-xs text-violet-200">
        <span>14</span>
        <span>16</span>
        <span>18</span>
        <span>20</span>
      </div>
    </Card>
  );
}
