import { MOOD_LEVELS, type Mood } from "@/lib/mood";

/** The model's read of the week's mood: a three-step meter, one sentence why, and checked quotes. */
export function AiRead({ mood }: { mood: Mood }) {
  const index = MOOD_LEVELS.indexOf(mood.level);
  return (
    <div className="ai-read">
      <div className="ai-read-head">
        <span className="ai-read-label">AI read</span>
        <div
          className="meter"
          role="meter"
          aria-label="AI read of the community's mood"
          aria-valuemin={0}
          aria-valuemax={MOOD_LEVELS.length - 1}
          aria-valuenow={index}
          aria-valuetext={mood.level}
        >
          {MOOD_LEVELS.map((level, i) => (
            <span key={level} className={`step${i <= index ? " filled" : ""}${i === index ? " current" : ""}`}>
              {level}
            </span>
          ))}
        </div>
      </div>
      <p className="ai-read-reason">{mood.reason}</p>
      {mood.quotes.length > 0 && (
        <ul className="quotes" aria-label="Quotes from this week">
          {mood.quotes.map((q) => (
            <li key={q}>&ldquo;{q}&rdquo;</li>
          ))}
        </ul>
      )}
    </div>
  );
}
