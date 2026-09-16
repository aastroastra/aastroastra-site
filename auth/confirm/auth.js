/* Sign-in values remain in memory and never go to this site's server or analytics. */
(() => {
  const fields = new URLSearchParams(window.location.hash.slice(1));
  window.history.replaceState(null, "", window.location.pathname);
  const hash = fields.get("token_hash") || "";
  const otp = fields.get("otp") || "";
  const type = fields.get("type");
  const duplicate = [...new Set(fields.keys())].some(key => fields.getAll(key).length !== 1);
  const button = document.getElementById("open-app");
  if (duplicate || !/^[A-Za-z0-9_-]{32,256}$/.test(hash) || !/^[0-9]{6}$/.test(otp) || type !== "email") {
    document.getElementById("message").textContent = "This link is incomplete. Open the newest sign-in email, or request another code in the app.";
    return;
  }
  const callback = new URL("aastroastra://login-callback");
  callback.hash = new URLSearchParams({ token_hash: hash, type: "email", otp }).toString();
  button.href = callback.toString();
  button.hidden = false;
  // Android App Links normally open the app directly. This button covers browsers
  // with app-link handling disabled and never verifies or consumes a code itself.
})();
