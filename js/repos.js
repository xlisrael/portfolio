/* ==========================================================================
   Excel — GitHub repositories
   Renders data/repos.js (falling back to data/repos.json). Both are refreshed
   by the GitHub Action in .github/workflows/update-repos.yml.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.querySelector("[data-repos]");
  if (!root) return;

  var status = root.querySelector("[data-repos-status]");
  var SOURCE = "data/repos.json";
  var GITHUB = "https://github.com/xlisrael";

  var LANGUAGE_COLOURS = {
    C: "#555555",
    "C#": "#178600",
    "C++": "#f34b7d",
    CSS: "#563d7c",
    Go: "#00ADD8",
    HTML: "#e34c26",
    Java: "#b07219",
    JavaScript: "#f1e05a",
    Kotlin: "#A97BFF",
    PHP: "#4F5D95",
    Python: "#3572A5",
    Ruby: "#701516",
    Rust: "#dea584",
    Shell: "#89e051",
    Swift: "#F05138",
    TypeScript: "#3178c6",
    Vue: "#41b883"
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function safeUrl(value) {
    var url = cleanText(value);
    if (!/^https?:\/\//i.test(url)) return "";
    return url;
  }

  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(date);
    } catch (error) {
      return "";
    }
  }

  function link(href, className, text) {
    var anchor = el("a", className, text);
    anchor.href = href;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    return anchor;
  }

  function showMessage(message) {
    if (!status) {
      status = el("p", "repos-status");
      root.appendChild(status);
    }
    status.textContent = message;
  }

  function repoCard(repo) {
    var card = el("article", "repo");

    var top = el("div", "repo-top");
    var name = cleanText(repo.name) || "Repository";
    var repoUrl = safeUrl(repo.url) || GITHUB;
    var heading = el("h4", "repo-name");
    heading.appendChild(link(repoUrl, "", name));
    top.appendChild(heading);

    var stars = Number(repo.stars) || 0;
    if (stars > 0) {
      var star = el("span", "repo-stars", "★ " + stars);
      star.setAttribute("aria-label", stars + (stars === 1 ? " star" : " stars"));
      top.appendChild(star);
    }
    card.appendChild(top);

    var description = cleanText(repo.description);
    if (description) card.appendChild(el("p", "repo-desc", description));

    if (Array.isArray(repo.topics) && repo.topics.length) {
      var topics = el("ul", "repo-topics");
      repo.topics.slice(0, 4).forEach(function (topic) {
        var item = el("li", "", String(topic));
        topics.appendChild(item);
      });
      card.appendChild(topics);
    }

    var meta = el("div", "repo-meta");
    var language = cleanText(repo.language);
    if (language) {
      var lang = el("span", "repo-lang", language);
      lang.style.setProperty("--lang", LANGUAGE_COLOURS[language] || "var(--accent)");
      meta.appendChild(lang);
    }

    var pushedAt = cleanText(repo.pushed_at);
    var readableDate = formatDate(pushedAt);
    if (readableDate) {
      var updated = el("time", "", "Updated " + readableDate);
      updated.dateTime = pushedAt;
      meta.appendChild(updated);
    }

    meta.appendChild(link(repoUrl, "repo-link", "Code →"));

    var homepage = safeUrl(repo.homepage);
    if (homepage && homepage !== repoUrl) meta.appendChild(link(homepage, "repo-link", "Live ↗"));

    card.appendChild(meta);
    return card;
  }

  function render(repos) {
    while (root.firstChild) root.removeChild(root.firstChild);

    repos.forEach(function (repo) {
      if (repo && typeof repo === "object") root.appendChild(repoCard(repo));
    });
  }

  function reposFrom(data) {
    return data && Array.isArray(data.repos) ? data.repos : [];
  }

  // data/repos.js is loaded first, so the cards also work when the page is
  // opened straight from disk. The JSON fetch is the fallback if that file is
  // missing or cached in an older form.
  var embedded = reposFrom(window.PORTFOLIO_REPOS);
  if (embedded.length) {
    render(embedded);
    return;
  }

  fetch(SOURCE, { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error("Request failed: " + response.status);
      return response.json();
    })
    .then(function (data) {
      var repos = reposFrom(data);
      if (!repos.length) throw new Error("No repositories in payload");
      render(repos);
    })
    .catch(function () {
      showMessage("Repositories are unavailable right now. See them on GitHub.");
    });
})();
