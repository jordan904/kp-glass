(function () {
  "use strict";

  // Set this to your deployed Worker URL (see chatbot-worker/README.md).
  var CHAT_API_BASE = "https://kp-chatbot.jordan-574.workers.dev";

  var OPENING_MESSAGE =
    "Hi! 👋 Welcome to KP Glass & Aluminum. How can we help with your project today?";

  var QUICK_OPTIONS = [
    { label: "Our Services", prompt: "What services does KP Glass & Aluminum offer?" },
    { label: "Start a Project", prompt: "I'd like to start a project with KP Glass & Aluminum." },
    { label: "Service Area", prompt: "What areas does KP Glass & Aluminum serve?" },
    { label: "View Our Work", prompt: "Can I see examples of your past projects?" },
    { label: "Contact Us", action: "lead-form" },
  ];

  var messages = [];
  var hasOpenedBefore = false;
  var isSending = false;

  function getSessionId() {
    try {
      var id = sessionStorage.getItem("kpChatSessionId");
      if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
        sessionStorage.setItem("kpChatSessionId", id);
      }
      return id;
    } catch (e) {
      return "";
    }
  }

  var root = document.createElement("div");
  root.innerHTML =
    '<button id="kp-chat-toggle" aria-expanded="false" aria-controls="kp-chat-panel" aria-label="Chat with KP Assistant">' +
    '<svg class="kp-chat-open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
    '<svg class="kp-chat-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    "<span>Chat with us</span>" +
    "</button>" +
    '<div id="kp-chat-panel" role="dialog" aria-label="KP Assistant chat" aria-hidden="true">' +
    '<div class="kp-chat-header">' +
    "<div>" +
    "<h2>KP Assistant</h2>" +
    "<p>Usually replies in a few minutes</p>" +
    "</div>" +
    '<button type="button" class="kp-chat-header-close" aria-label="Close chat"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
    "</div>" +
    '<div id="kp-chat-body"></div>' +
    "</div>";

  document.body.appendChild(root);

  var toggleBtn = document.getElementById("kp-chat-toggle");
  var panel = document.getElementById("kp-chat-panel");
  var closeBtn = panel.querySelector(".kp-chat-header-close");
  var body = document.getElementById("kp-chat-body");

  function renderChatView() {
    body.innerHTML =
      '<div class="kp-chat-messages" id="kp-chat-messages" aria-live="polite"></div>' +
      '<div class="kp-chat-quick-options" id="kp-chat-quick-options"></div>' +
      '<div class="kp-chat-footer">' +
      '<form id="kp-chat-form" class="kp-chat-input-row">' +
      '<input type="text" id="kp-chat-input" placeholder="Type your message…" aria-label="Type your message" autocomplete="off">' +
      '<button type="submit" class="kp-chat-send" aria-label="Send message"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>' +
      "</form>" +
      '<p class="kp-chat-alt-action">Prefer to leave your info instead? <button type="button" id="kp-chat-alt-btn">Contact our team →</button></p>' +
      "</div>";

    var messagesEl = document.getElementById("kp-chat-messages");
    messages.forEach(function (m) {
      appendBubble(messagesEl, m.role, m.content);
    });

    if (messages.length <= 1) {
      renderQuickOptions();
    }

    document.getElementById("kp-chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("kp-chat-input");
      var text = input.value.trim();
      if (!text || isSending) return;
      input.value = "";
      sendUserMessage(text);
    });

    var altBtn = document.getElementById("kp-chat-alt-btn");
    altBtn.addEventListener("click", function () {
      renderLeadForm();
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderQuickOptions() {
    var container = document.getElementById("kp-chat-quick-options");
    if (!container) return;
    container.innerHTML = "";
    QUICK_OPTIONS.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kp-chat-quick-btn";
      btn.textContent = opt.label;
      btn.addEventListener("click", function () {
        container.innerHTML = "";
        if (opt.action === "lead-form") {
          renderLeadForm();
        } else {
          sendUserMessage(opt.prompt);
        }
      });
      container.appendChild(btn);
    });
  }

  function appendBubble(container, role, text) {
    var bubble = document.createElement("div");
    bubble.className = "kp-chat-bubble " + (role === "user" ? "user" : "bot");
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  function sendUserMessage(text) {
    var messagesEl = document.getElementById("kp-chat-messages");
    messages.push({ role: "user", content: text });
    appendBubble(messagesEl, "user", text);

    var typing = document.createElement("div");
    typing.className = "kp-chat-typing";
    typing.id = "kp-chat-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    isSending = true;

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 25000) : null;

    fetch(CHAT_API_BASE + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages, sessionId: getSessionId() }),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then(function (data) {
        var typingEl = document.getElementById("kp-chat-typing");
        if (typingEl) typingEl.remove();
        var reply = data.reply || "Sorry, I didn't catch that. Could you rephrase?";
        messages.push({ role: "assistant", content: reply });
        appendBubble(messagesEl, "assistant", reply);
      })
      .catch(function () {
        if (timeoutId) clearTimeout(timeoutId);
        var typingEl = document.getElementById("kp-chat-typing");
        if (typingEl) typingEl.remove();
        appendBubble(
          messagesEl,
          "assistant",
          "Sorry, I'm having trouble connecting right now. Please email info@kp-glass.ca or call 902-406-2595."
        );
      })
      .finally(function () {
        isSending = false;
      });
  }

  function renderLeadForm() {
    body.innerHTML =
      '<form class="kp-chat-lead-form" id="kp-chat-lead-form">' +
      '<div id="kp-chat-lead-error" class="kp-chat-lead-error" aria-live="polite"></div>' +
      '<div><label for="kp-lead-name">Name</label><input id="kp-lead-name" name="name" type="text" autocomplete="name" required></div>' +
      '<div><label for="kp-lead-email">Email</label><input id="kp-lead-email" name="email" type="email" inputmode="email" autocomplete="email" required></div>' +
      '<div><label for="kp-lead-phone">Phone (optional)</label><input id="kp-lead-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel"></div>' +
      '<div><label for="kp-lead-type">Type of inquiry</label>' +
      '<select id="kp-lead-type" name="type">' +
      "<option>General inquiry</option>" +
      "<option>Get a quote</option>" +
      "<option>Accessibility solutions</option>" +
      "<option>Careers / resume</option>" +
      "<option>Media & partnerships</option>" +
      "</select></div>" +
      '<div><label for="kp-lead-desc">Tell us a bit about what you need</label><textarea id="kp-lead-desc" name="description" required></textarea></div>' +
      '<div class="kp-chat-lead-honeypot"><label for="kp-lead-company">Company</label><input id="kp-lead-company" name="company" type="text" tabindex="-1" aria-hidden="true" autocomplete="off"></div>' +
      '<button type="submit" class="kp-chat-lead-submit">Send to our team</button>' +
      '<button type="button" class="kp-chat-alt-action" id="kp-chat-back-btn">← Back to chat</button>' +
      "</form>";

    document.getElementById("kp-chat-back-btn").addEventListener("click", renderChatView);

    document.getElementById("kp-chat-lead-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var errorEl = document.getElementById("kp-chat-lead-error");
      errorEl.textContent = "";

      var payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        type: form.type.value,
        description: form.description.value.trim(),
        company: form.company.value,
        transcript: messages.map(function (m) { return m.role + ": " + m.content; }).join("\n"),
      };

      var submitBtn = form.querySelector(".kp-chat-lead-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      fetch(CHAT_API_BASE + "/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("bad response");
          return res.json();
        })
        .then(function () {
          renderLeadSuccess();
        })
        .catch(function () {
          errorEl.textContent = "Something went wrong. Please email info@kp-glass.ca or call 902-406-2595.";
          submitBtn.disabled = false;
          submitBtn.textContent = "Send to our team";
        });
    });
  }

  function renderLeadSuccess() {
    body.innerHTML =
      '<div class="kp-chat-lead-success">' +
      "<p>Thanks! We've got your info and someone from our team will be in touch soon.</p>" +
      '<button type="button" class="kp-chat-alt-action" id="kp-chat-back-btn-2">← Back to chat</button>' +
      "</div>";
    document.getElementById("kp-chat-back-btn-2").addEventListener("click", renderChatView);
  }

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    toggleBtn.setAttribute("aria-expanded", "true");

    if (!hasOpenedBefore) {
      hasOpenedBefore = true;
      messages.push({ role: "assistant", content: OPENING_MESSAGE });
      renderChatView();
    }

    var input = document.getElementById("kp-chat-input");
    if (input) input.focus();
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.focus();
  }

  toggleBtn.addEventListener("click", function () {
    var isOpen = panel.classList.contains("open");
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener("click", closePanel);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) {
      closePanel();
    }
  });
})();
