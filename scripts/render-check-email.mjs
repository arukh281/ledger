#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const outcome = process.env.CHECK_OUTCOME ?? "failure";
const logPath = process.env.LOG_PATH ?? "";
const ts = process.env.TS ?? new Date().toISOString();
const runUrl = process.env.RUN_URL ?? "";
const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
const outDir = process.env.RUNNER_TEMP ?? os.tmpdir();

const log = logPath && fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8") : "";
const success = outcome === "success";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function detectChecks(logText) {
  const lintOk = !/✖ \d+ problems \(\d+ errors/.test(logText);
  const buildOk = /Compiled successfully/.test(logText);
  const supabaseOk = /GoTrue/.test(logText) || /Supabase auth health/.test(logText);
  const liveOk =
    !appUrl ||
    /GET \/party → 200/.test(logText) ||
    /GET \/ → 200/.test(logText) ||
    (/=== Live app/.test(logText) && !/Live app check failed/.test(logText));

  return [
    { name: "Lint", ok: lintOk, detail: lintOk ? "No errors" : "ESLint reported errors" },
    { name: "Build", ok: buildOk, detail: buildOk ? "Production build OK" : "Build failed" },
    {
      name: "Supabase",
      ok: supabaseOk,
      detail: supabaseOk ? "Auth + database reachable" : "Connection failed",
    },
    {
      name: "Live app",
      ok: liveOk,
      detail: appUrl
        ? liveOk
          ? `${appUrl} responded`
          : "Site unreachable"
        : "Skipped (no APP_URL)",
    },
  ];
}

function failureSummary(logText) {
  const lines = logText.split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i].trim();
    if (
      line &&
      (/failed|error|HTTP [45]/i.test(line) ||
        /^Supabase|^Live app|^Expected HTTP/.test(line))
    ) {
      return line.slice(0, 240);
    }
  }
  return "One or more checks failed. See log below.";
}

function checkRow(check) {
  const icon = check.ok ? "✓" : "✕";
  const color = check.ok ? "#2d6a4f" : "#b42318";
  const bg = check.ok ? "#f6fef9" : "#fffafa";

  return `
      <tr>
        <td style="padding:12px 14px;border:1px solid #e8e4dc;background:${bg};border-radius:10px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="28" style="font-size:18px;font-weight:700;color:${color};vertical-align:top;">${icon}</td>
              <td style="vertical-align:top;">
                <div style="font-size:15px;font-weight:600;color:#1c1917;margin:0;">${escapeHtml(check.name)}</div>
                <div style="font-size:13px;color:#57534e;margin-top:4px;">${escapeHtml(check.detail)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

const checks = detectChecks(log);
const dateLabel = formatDate(ts);
const subject = success
  ? `✅ Tally · All checks passed · ${dateLabel}`
  : `❌ Tally · Check failed · ${dateLabel}`;

const statusColor = success ? "#2d6a4f" : "#b42318";
const statusBg = success ? "#ecfdf3" : "#fef3f2";
const statusBorder = success ? "#abefc6" : "#fecdca";
const statusLabel = success ? "All systems go" : "Action needed";
const statusIcon = success ? "✓" : "!";
const statusMessage = success
  ? "Lint, build, Supabase, and live app checks completed successfully."
  : escapeHtml(failureSummary(log));

const checkRows = checks.map(checkRow).join("");
const appLink = appUrl
  ? `<a href="${escapeHtml(appUrl)}" style="color:#1d4ed8;text-decoration:none;">${escapeHtml(appUrl)}</a>`
  : "Not configured";

const logBlock = success
  ? ""
  : `
    <tr>
      <td style="padding:24px 28px 0;">
        <div style="font-size:13px;font-weight:700;color:#1c1917;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Error log</div>
        <div style="background:#111827;color:#e5e7eb;border-radius:12px;padding:16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-x:auto;">${escapeHtml(log.trim() || "No log captured.")}</div>
      </td>
    </tr>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f1ea;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f1ea;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#ffffff;border:1px solid #e8e4dc;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(28,25,23,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a4731 0%,#2d6a4f 100%);padding:28px 28px 24px;color:#ffffff;">
              <div style="font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.82;margin-bottom:8px;">Tally Ledger</div>
              <div style="font-size:28px;font-weight:700;line-height:1.2;margin:0;">Daily health report</div>
              <div style="font-size:14px;opacity:0.9;margin-top:8px;">${escapeHtml(dateLabel)} IST</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${statusBg};border:1px solid ${statusBorder};border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td width="36" style="font-size:22px;font-weight:700;color:${statusColor};">${statusIcon}</td>
                        <td>
                          <div style="font-size:18px;font-weight:700;color:${statusColor};">${statusLabel}</div>
                          <div style="font-size:14px;color:#44403c;margin-top:4px;">${statusMessage}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 0;">
              <div style="font-size:13px;font-weight:700;color:#1c1917;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:12px;">Checks</div>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${checkRows}</table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#fafaf9;border:1px solid #ece7df;border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px;font-size:14px;line-height:1.7;color:#44403c;">
                    <div><strong style="color:#1c1917;">Live app</strong><br />${appLink}</div>
                    <div style="margin-top:14px;"><strong style="color:#1c1917;">Workflow run</strong><br /><a href="${escapeHtml(runUrl)}" style="color:#1d4ed8;text-decoration:none;">View on GitHub</a></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${logBlock}
          <tr>
            <td style="padding:8px 28px 28px;font-size:12px;color:#78716c;line-height:1.6;">
              Automated daily check · Supabase keep-alive · ${escapeHtml(ts)} UTC
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const text = success
  ? `Tally daily check passed (${dateLabel} IST)

Checks:
${checks.map((c) => `- ${c.name}: ${c.ok ? "OK" : "FAILED"} — ${c.detail}`).join("\n")}

Live app: ${appUrl || "not configured"}
Workflow: ${runUrl}
`
  : `Tally daily check FAILED (${dateLabel} IST)

${failureSummary(log)}

Workflow: ${runUrl}

--- Log ---
${log.trim()}
`;

const htmlFile = path.join(outDir, "email-body.html");
const textFile = path.join(outDir, "email-body.txt");
fs.writeFileSync(htmlFile, html);
fs.writeFileSync(textFile, text);

const outputFile = process.env.GITHUB_OUTPUT;
if (outputFile) {
  fs.appendFileSync(
    outputFile,
    `subject<<EOF\n${subject}\nEOF\nhtml_body_file=${htmlFile}\ntext_body_file=${textFile}\n`,
  );
}
