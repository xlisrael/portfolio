/* ==========================================================================
   Excel — Contact form
   Progressive enhancement: without JavaScript the form still submits,
   because it falls back to a plain mailto: action.
   ========================================================================== */

(function () {
  "use strict";

  var CONFIG = {
    /* ------------------------------------------------------------------
       How messages get delivered.

       Leave `endpoint` empty and the form opens the visitor's own mail
       app with the message already written out. That works with no
       setup at all, but it depends on the visitor having a mail client
       configured.

       To have messages arrive on their own, sign up for a free
       Formspree account (formspree.io), create a form that points at
       israelexcel2006@gmail.com, and paste its endpoint below:

           endpoint: "https://formspree.io/f/xxxxxxxx",

       Any service that accepts a JSON POST with the same field names
       works the same way.
       ------------------------------------------------------------------ */
    endpoint: "",

    to: "israelexcel2006@gmail.com"
  };

  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = document.getElementById("cf-status");
  var sendBtn = document.getElementById("cf-send");
  var counter = document.getElementById("cf-count");
  var message = document.getElementById("cf-message");

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* --------------------------------------------------------------------
     Field helpers
     -------------------------------------------------------------------- */

  function fieldOf(input) {
    return input.closest(".field");
  }

  function errorFor(input) {
    var field = fieldOf(input);
    return field ? field.querySelector(".err") : null;
  }

  function setError(input, messageText) {
    var err = errorFor(input);
    if (err) err.textContent = messageText || "";
    if (messageText) {
      input.setAttribute("aria-invalid", "true");
    } else {
      input.removeAttribute("aria-invalid");
    }
  }

  function clearErrors() {
    var inputs = form.querySelectorAll("input, textarea");
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].name !== "company") setError(inputs[i], "");
    }
  }

  /* --------------------------------------------------------------------
     Validation
     -------------------------------------------------------------------- */

  function validate() {
    var errors = [];
    var values = {};

    var name = form.elements.name;
    var email = form.elements.email;
    var subject = form.elements.subject;
    var body = form.elements.message;

    values.name = name.value.trim();
    values.email = email.value.trim();
    values.subject = subject.value.trim();
    values.message = body.value.trim();

    if (!values.name) {
      setError(name, "Please enter your name.");
      errors.push(name);
    } else if (values.name.length < 2) {
      setError(name, "That name looks too short.");
      errors.push(name);
    } else {
      setError(name, "");
    }

    if (!values.email) {
      setError(email, "Please enter your email.");
      errors.push(email);
    } else if (!EMAIL_RE.test(values.email)) {
      setError(email, "That email address does not look right.");
      errors.push(email);
    } else {
      setError(email, "");
    }

    if (!values.subject) {
      setError(subject, "Please add a subject.");
      errors.push(subject);
    } else {
      setError(subject, "");
    }

    if (!values.message) {
      setError(body, "Please write a message.");
      errors.push(body);
    } else if (values.message.length < 10) {
      setError(body, "A little more detail, please.");
      errors.push(body);
    } else {
      setError(body, "");
    }

    return { ok: errors.length === 0, errors: errors, values: values };
  }

  /* --------------------------------------------------------------------
     Status line
     -------------------------------------------------------------------- */

  function setStatus(text, tone) {
    if (!status) return;
    status.textContent = text || "";
    if (tone) status.setAttribute("data-tone", tone);
    else status.removeAttribute("data-tone");
  }

  function setBusy(busy) {
    if (!sendBtn) return;
    sendBtn.setAttribute("data-busy", busy ? "true" : "false");
    sendBtn.disabled = !!busy;
  }

  /* --------------------------------------------------------------------
     Character counter
     -------------------------------------------------------------------- */

  function updateCount() {
    if (!counter || !message) return;
    var n = message.value.length;
    counter.textContent = n === 1 ? "1 character" : n + " characters";
  }

  if (message) {
    message.addEventListener("input", updateCount);
    updateCount();
  }

  // Clear a field's error as soon as the visitor starts fixing it.
  form.addEventListener("input", function (event) {
    var input = event.target;
    if (input.name && input.name !== "company" && input.getAttribute("aria-invalid") === "true") {
      setError(input, "");
    }
  });

  /* --------------------------------------------------------------------
     Delivery
     -------------------------------------------------------------------- */

  function buildMailto(values) {
    var body =
      "Name: " + values.name + "\n" +
      "Email: " + values.email + "\n\n" +
      values.message;

    return (
      "mailto:" +
      CONFIG.to.trim() +
      "?subject=" +
      encodeURIComponent(values.subject) +
      "&body=" +
      encodeURIComponent(body)
    );
  }

  function submitToEndpoint(values) {
    return fetch(CONFIG.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    }).then(function (response) {
      if (!response.ok) throw new Error("Request failed: " + response.status);
      return response;
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    clearErrors();
    var result = validate();

    if (!result.ok) {
      setStatus("Please fix the highlighted fields.", "err");
      if (result.errors.length) result.errors[0].focus();
      return;
    }

    // Honeypot: a bot filled a field nobody can see. Pretend it worked.
    if (form.elements.company && form.elements.company.value) {
      form.reset();
      updateCount();
      setStatus("Thanks — your message is on its way.", "ok");
      return;
    }

    setStatus("");
    setBusy(true);

    if (CONFIG.endpoint) {
      submitToEndpoint(result.values).then(
        function () {
          setBusy(false);
          form.reset();
          updateCount();
          setStatus("Thanks — your message is on its way.", "ok");
        },
        function () {
          setBusy(false);
          setStatus("That did not go through. Email me directly instead.", "err");
        }
      );
      return;
    }

    // No endpoint configured: hand the message to the visitor's mail app.
    window.location.href = buildMailto(result.values);
    setBusy(false);
    setStatus("Opening your mail app — press send there to deliver it.", "ok");
  });
})();
