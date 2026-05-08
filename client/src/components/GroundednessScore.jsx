const LEVEL_LABELS = {
  green: 'High score. Factually reliable response.',
  gold: 'Average score. Reliable response, may exhibit minor drift from source.',
  red: 'Low score. Unreliable response, factually inaccurate or hallucination.',
};

function GroundednessScore({ score }) {
  if (score == null) return null;

  const pct = Math.round(score * 100);
  let level = 'red';
  if (pct >= 75) level = 'green';
  else if (pct >= 50) level = 'gold';

  return (
    <span className={`groundedness-score ${level}`}>
      Grounded: {pct}% &ndash; {LEVEL_LABELS[level]}
    </span>
  );
}

export default GroundednessScore;
