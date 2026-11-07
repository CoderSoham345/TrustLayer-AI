import type { Claim } from '@/components/ClaimBreakdown';

export interface ExportableResult {
  question?: string;
  answer?: string;
  overallVerdict?: string;
  reliabilityScore?: number;
  claims: Claim[];
}

const ICONS: Record<Claim['verdict'], string> = {
  SUPPORTED: '✅',
  CONTRADICTED: '❌',
  UNVERIFIABLE: '⚪',
};

/** Same shape as the public API response, plus question/answer when known. */
export function buildExportPayload(r: ExportableResult) {
  const count = (v: Claim['verdict']) => r.claims.filter((c) => c.verdict === v).length;
  return {
    ...(r.question ? { question: r.question } : {}),
    ...(r.answer ? { answer: r.answer } : {}),
    overallVerdict: r.overallVerdict,
    reliabilityScore: r.reliabilityScore,
    totalClaims: r.claims.length,
    supportedCount: count('SUPPORTED'),
    contradictedCount: count('CONTRADICTED'),
    unverifiableCount: count('UNVERIFIABLE'),
    claims: r.claims,
  };
}

/** Readable summary for pasting into Slack or Jira. */
export function formatResultAsText(r: ExportableResult): string {
  const lines: string[] = ['TrustLayer Hallucination Check'];

  if (r.overallVerdict) {
    const score = r.reliabilityScore !== undefined ? ` (reliability ${Math.round(r.reliabilityScore)}%)` : '';
    lines.push(`Overall: ${r.overallVerdict}${score}`);
  }
  if (r.question) lines.push(`Question: ${r.question}`);
  if (r.answer) lines.push(`Answer: ${r.answer}`);
  lines.push('');

  r.claims.forEach((c, i) => {
    lines.push(`${i + 1}. ${ICONS[c.verdict]} ${c.verdict} (${Math.round(c.confidence * 100)}%)`);
    lines.push(`   Claim: ${c.claim}`);
    lines.push(c.evidenceSentence ? `   Evidence: ${c.evidenceSentence}` : '   Evidence: none found in workspace documents');
  });

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts or older browsers
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}