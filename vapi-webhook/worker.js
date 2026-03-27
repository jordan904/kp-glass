/**
 * Vapi Webhook → Email Transcript Worker
 *
 * Deploy to Cloudflare Workers. Receives Vapi end-of-call reports
 * and emails the transcript to the configured address.
 *
 * Environment variables (set in Cloudflare dashboard):
 *   RESEND_API_KEY  — API key from resend.com
 *   EMAIL_TO        — recipient email (jordan@novaworksdigital.ca)
 *   EMAIL_FROM      — sender email (e.g. clara@novaworksdigital.ca)
 */

export default {
  async fetch(request, env) {
    // Only accept POST
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    try {
      const payload = await request.json();

      // Only process end-of-call reports
      if (payload.message && payload.message.type !== "end-of-call-report") {
        return new Response("OK", { status: 200 });
      }

      const message = payload.message || payload;
      const rawTranscript = message.transcript || "No transcript available";

      // Vapi sends transcript as an array of {role, message} objects
      var transcript;
      if (Array.isArray(rawTranscript)) {
        transcript = rawTranscript.map(function (entry) {
          var speaker = entry.role === "assistant" ? "Clara" : "Caller";
          return speaker + ": " + (entry.message || entry.content || "");
        }).join("\n");
      } else if (typeof rawTranscript === "string") {
        transcript = rawTranscript;
      } else {
        transcript = JSON.stringify(rawTranscript, null, 2);
      }
      const summary = message.summary || "No summary available";
      const recordingUrl = message.recordingUrl || "No recording";
      const startedAt = message.startedAt || message.call?.startedAt || "Unknown";
      const endedAt = message.endedAt || message.call?.endedAt || "Unknown";
      const duration = message.durationSeconds || message.call?.duration || "Unknown";
      const callerNumber = message.call?.customer?.number || "Unknown";

      // Format duration
      var durationStr = duration;
      if (typeof duration === "number") {
        var mins = Math.floor(duration / 60);
        var secs = duration % 60;
        durationStr = mins + "m " + secs + "s";
      }

      // Format date
      var dateStr = startedAt;
      try {
        dateStr = new Date(startedAt).toLocaleString("en-CA", {
          timeZone: "America/Halifax",
          dateStyle: "medium",
          timeStyle: "short"
        });
      } catch (e) {}

      // Build email HTML
      var html = '<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">';
      html += '<div style="background:#0a1628;color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">';
      html += '<h1 style="margin:0;font-size:1.4rem;">Clara — Call Transcript</h1>';
      html += '<p style="margin:8px 0 0;opacity:0.7;font-size:0.9rem;">KP Glass & Aluminum Voice Assistant</p>';
      html += '</div>';

      html += '<div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">';

      // Call details
      html += '<div style="background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:20px;">';
      html += '<h3 style="margin:0 0 12px;font-size:0.9rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Call Details</h3>';
      html += '<table style="width:100%;font-size:0.9rem;">';
      html += '<tr><td style="padding:4px 0;color:#64748b;">Date</td><td style="padding:4px 0;font-weight:600;">' + dateStr + '</td></tr>';
      html += '<tr><td style="padding:4px 0;color:#64748b;">Duration</td><td style="padding:4px 0;font-weight:600;">' + durationStr + '</td></tr>';
      html += '<tr><td style="padding:4px 0;color:#64748b;">Caller</td><td style="padding:4px 0;font-weight:600;">' + callerNumber + '</td></tr>';
      if (recordingUrl !== "No recording") {
        html += '<tr><td style="padding:4px 0;color:#64748b;">Recording</td><td style="padding:4px 0;"><a href="' + recordingUrl + '" style="color:#3b82f6;">Listen</a></td></tr>';
      }
      html += '</table></div>';

      // Summary
      html += '<div style="margin-bottom:20px;">';
      html += '<h3 style="margin:0 0 8px;font-size:0.9rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Summary</h3>';
      html += '<p style="margin:0;line-height:1.6;">' + summary + '</p>';
      html += '</div>';

      // Transcript
      html += '<div>';
      html += '<h3 style="margin:0 0 12px;font-size:0.9rem;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Full Transcript</h3>';
      html += '<div style="background:#f8fafc;padding:16px;border-radius:8px;font-size:0.9rem;line-height:1.7;white-space:pre-wrap;">' + transcript + '</div>';
      html += '</div>';

      html += '</div></body></html>';

      // Plain text version
      var text = "Clara — Call Transcript\n";
      text += "KP Glass & Aluminum\n\n";
      text += "Date: " + dateStr + "\n";
      text += "Duration: " + durationStr + "\n";
      text += "Caller: " + callerNumber + "\n";
      if (recordingUrl !== "No recording") {
        text += "Recording: " + recordingUrl + "\n";
      }
      text += "\n--- Summary ---\n" + summary + "\n";
      text += "\n--- Transcript ---\n" + transcript + "\n";

      // Send email via Resend
      var emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || "Clara <clara@novaworksdigital.ca>",
          to: [env.EMAIL_TO || "jordan@novaworksdigital.ca"],
          subject: "Clara Call Transcript — " + dateStr,
          html: html,
          text: text
        })
      });

      var emailResult = await emailRes.json();

      if (!emailRes.ok) {
        console.error("Email send failed:", JSON.stringify(emailResult));
        return new Response(JSON.stringify({ error: "Email failed", details: emailResult }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ success: true, emailId: emailResult.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    } catch (e) {
      console.error("Webhook error:", e.message);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
