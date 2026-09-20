const PHASES = ['DIVE', 'DRIFT', 'SENSE', 'DECIDE', 'SURFACE', 'TRANSMIT'];

export default function MissionStep({ currentPhase }: { currentPhase: string }) {
  const idx = PHASES.indexOf(currentPhase);
  const isPaused = currentPhase === 'PAUSED';

  return (
    <div className="flex items-center gap-1">
      {PHASES.map((phase, i) => {
        const completed = !isPaused && idx >= 0 && i < idx;
        const current = !isPaused && i === idx;
        // When a transition has occurred (DIVE visited) treat later phases as pending
        return (
          <div key={phase} className="flex items-center gap-1">
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                current
                  ? 'border-teal-500/70 bg-teal-500/15 text-teal-300 shadow-glow-soft'
                  : completed
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-abyss-600/60 bg-abyss-900/60 text-slate-500'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  current
                    ? 'bg-teal-400 animate-pulse-slow'
                    : completed
                      ? 'bg-emerald-400'
                      : 'bg-slate-600'
                }`}
              />
              {current ? phase : completed ? phase : phase}
            </div>
            {i < PHASES.length - 1 && (
              <div className={`h-px w-4 ${completed ? 'bg-emerald-500/40' : 'bg-abyss-600/60'}`} />
            )}
          </div>
        );
      })}
      {isPaused && (
        <span className="ml-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          ⏸ Paused
        </span>
      )}
    </div>
  );
}