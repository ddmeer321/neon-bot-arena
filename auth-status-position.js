(function () {
  var settingsBtn = document.getElementById("settingsBtn");
  var authStatus = document.getElementById("auth-status");
  if (!settingsBtn || !authStatus) return;

  function reposition() {
    var rect = settingsBtn.getBoundingClientRect();
    var gap = 10;
    authStatus.style.right = window.innerWidth - rect.left + gap + "px";
    authStatus.style.top = rect.top + "px";
  }

  reposition();
  window.addEventListener("resize", reposition);
  if (window.ResizeObserver) {
    new ResizeObserver(reposition).observe(settingsBtn);
  }
})();
