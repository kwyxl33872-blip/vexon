const firebaseConfig = {
  apiKey: "AIzaSyAm_JxZ59zLD8ZOQEP5-j3uvgNpHT2bGdk",
  authDomain: "authentication-98a28.firebaseapp.com",
  projectId: "authentication-98a28",
  storageBucket: "authentication-98a28.firebasestorage.app",
  messagingSenderId: "115858509043",
  appId: "1:115858509043:web:e4dfe88710a2c62e74bb86",
  measurementId: "G-58XJ4V1NKR",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const TAB_STORAGE_KEY = "activeSidebarTab";
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".content");

function setActiveTab(targetId) {
  if (!tabs.length || !panels.length) return;
  let matched = false;
  tabs.forEach(function (item) {
    const isActive = item.dataset.target === targetId;
    item.classList.toggle("active", isActive);
    if (isActive) matched = true;
  });
  if (!matched && tabs[0]) {
    tabs.forEach(function (item) {
      item.classList.remove("active");
    });
    tabs[0].classList.add("active");
    targetId = tabs[0].dataset.target;
  }
  panels.forEach(function (panel) {
    panel.classList.toggle("active", panel.id === targetId);
  });
}

function getCurrentActiveTabId() {
  const active = document.querySelector(".tab.active");
  return active
    ? active.dataset.target
    : tabs[0]
      ? tabs[0].dataset.target
      : null;
}

function saveActiveTab(targetId) {
  try {
    if (targetId) localStorage.setItem(TAB_STORAGE_KEY, targetId);
  } catch (e) {
    console.error("Failed to save active tab", e);
  }
}

function restoreActiveTab() {
  const stored = localStorage.getItem(TAB_STORAGE_KEY);
  if (stored) {
    setActiveTab(stored);
  } else if (tabs[0]) {
    setActiveTab(tabs[0].dataset.target);
  }
}

if (tabs.length && panels.length) {
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      const targetId = tab.dataset.target;
      if (!targetId) return;

      setActiveTab(targetId);
      saveActiveTab(targetId);

      if (targetId === "social") {
        const u = auth.currentUser;
        if (u) loadSocialData(u);
      }
      if (targetId === "history") {
        renderHistory();
      }
    });
  });
  restoreActiveTab();
}

const settingsBtn = document.querySelector(".settings-btn");
const settingsOverlay = document.querySelector(".settings-overlay");
const settingsClose = document.querySelector(".settings-close");

function getBrowserName() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
  if (/OPR\//.test(ua) || /Opera\//.test(ua)) return "Opera";
  return "Unknown browser";
}

function getDeviceType() {
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    return "Mobile / Tablet";
  }
  return "Desktop";
}

function getOSName() {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("win")) return "Windows";
  if (platform.includes("mac")) return "macOS";
  if (platform.includes("linux")) return "Linux";
  if (/iphone|ipad|ipod/.test(platform)) return "iOS";
  if (/android/.test(platform)) return "Android";
  return "Unknown OS";
}

function getScreenSize() {
  return `${window.screen.width} × ${window.screen.height}`;
}

function getStatusText() {
  return navigator.onLine ? "Online" : "Offline";
}

function setInfoValue(key, value) {
  const element = document.querySelector(`.info-value[data-key="${key}"]`);
  if (element) {
    element.textContent = value;
  }
}

async function fetchPublicIP() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    if (!response.ok) throw new Error("IP fetch failed");
    const data = await response.json();
    setInfoValue("ip", data.ip || "Unavailable");
  } catch (error) {
    setInfoValue("ip", "Unavailable");
  }
}

function fillSettingsInfo() {
  setInfoValue("device", `${getDeviceType()} • ${getOSName()}`);
  setInfoValue("browser", getBrowserName());
  setInfoValue("screen", getScreenSize());
  setInfoValue("status", getStatusText());

  const user = auth.currentUser;
  if (user) {
    setInfoValue("uid", user.uid);

    db.collection("users")
      .doc(user.uid)
      .get()
      .then(function (doc) {
        if (doc.exists) {
          const data = doc.data();
          setInfoValue("account", data.username || "Not logged in");
          setInfoValue("email", data.email || "—");

          const accountKeyDisplay = document.querySelector(
            ".account-key-display",
          );
          const passwordDisplay = document.querySelector(".password-display");
          if (accountKeyDisplay)
            accountKeyDisplay.textContent = data.accessKey
              ? maskString(data.accessKey)
              : "—";
          if (passwordDisplay)
            passwordDisplay.textContent = data.password
              ? "•".repeat(Math.min(data.password.length, 8))
              : "—";

          if (accountKeyDisplay)
            accountKeyDisplay.dataset.actual = data.accessKey || "";
          if (passwordDisplay)
            passwordDisplay.dataset.actual = data.password || "";
        }
      })
      .catch(function (error) {
        console.error("Error fetching user profile:", error);
        setInfoValue("account", "Not logged in");
        setInfoValue("email", "—");
      });
  } else {
    setInfoValue("account", "Not logged in");
    setInfoValue("email", "—");
    setInfoValue("uid", "—");
    document.querySelector(".account-key-display").textContent = "—";
    document.querySelector(".password-display").textContent = "—";
  }

  fetchPublicIP();
}

function maskString(str) {
  if (!str || str.length === 0) return "—";
  return "•".repeat(str.length);
}

function openSettings() {
  document.body.classList.add("settings-open");
  settingsOverlay.classList.add("active");
  settingsOverlay.setAttribute("aria-hidden", "false");
  fillSettingsInfo();
}

function closeSettings() {
  document.body.classList.remove("settings-open");
  settingsOverlay.classList.remove("active");
  settingsOverlay.setAttribute("aria-hidden", "true");
}

const settingsSave = document.querySelector(".settings-action");
const loginButton = document.querySelector(".login-button");
const authOverlay = document.querySelector(".auth-overlay");
const authClose = document.querySelector(".auth-close");
const authTabs = document.querySelectorAll(".auth-tab");
const authTabsContainer = document.querySelector(".auth-tabs");
const authLoginPanel = document.getElementById("auth-login-panel");
const authSignupPanel = document.getElementById("auth-signup-panel");
const authAccountPanel = document.getElementById("auth-account-panel");
const passwordResetOverlay = document.getElementById("password-reset-overlay");
const passwordResetCurrentInput = document.getElementById(
  "password-reset-current",
);
const passwordResetNewInput = document.getElementById("password-reset-new");
const confirmResetBtn = document.getElementById("confirm-reset-btn");
const cancelResetBtn = document.getElementById("cancel-reset-btn");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const signupEmailInput = document.getElementById("signup-email");
const signupUsernameInput = document.getElementById("signup-username");
const signupPasswordInput = document.getElementById("signup-password");
const authStatus = document.getElementById("auth-status");
const accountUsername = document.getElementById("account-username");
const accountEmail = document.getElementById("account-email");
const accountKeySpan = document.getElementById("account-key");
const resetPasswordBtn = document.getElementById("reset-password-btn");
const deleteAccountButton = document.getElementById("delete-account-button");
const logoutButton = document.getElementById("logout-button");
const brandLogo = document.querySelector(".brand-logo");
const brandText = document.querySelector(".brand-text");

function isValidGmail(email) {
  const trimmed = (email || "").trim().toLowerCase();
  return (
    trimmed.endsWith("@gmail.com") &&
    trimmed.indexOf("@") === trimmed.lastIndexOf("@") &&
    trimmed.length > 10
  );
}

function generateAccountKey() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 24 }, function () {
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }).join("");
}

function getCurrentAuth() {
  return auth.currentUser;
}

function updateAuthBadge() {
  const user = auth.currentUser;
  if (!user) {
    if (brandText) brandText.textContent = "Not logged in";
    if (loginButton) loginButton.textContent = "Login / Sign Up";
    if (authAccountPanel) authAccountPanel.classList.add("hidden");
  } else {
    db.collection("users")
      .doc(user.uid)
      .get()
      .then(function (doc) {
        if (doc.exists) {
          const data = doc.data();
          if (brandText) brandText.textContent = "☆ " + data.username + " ☆";
        }
      })
      .catch(function (error) {
        console.error("Error fetching user profile:", error);
      });
    if (loginButton) loginButton.textContent = "Account";
  }
}

auth.onAuthStateChanged(function (user) {
  updateAuthBadge();
  if (user) {
    renderAuthPanels();
  }
});

function showAuthStatus(message, type = "error") {
  if (!authStatus) return;
  authStatus.textContent = message;
  authStatus.className = `auth-status ${type}`;
}

function setAuthMode(mode) {
  const user = auth.currentUser;

  if (authTabsContainer) authTabsContainer.classList.remove("hidden");
  authTabs.forEach(function (tab) {
    tab.classList.toggle("active", tab.dataset.mode === mode);
  });

  if (authLoginPanel)
    authLoginPanel.classList.toggle("hidden", mode !== "login");
  if (authSignupPanel)
    authSignupPanel.classList.toggle("hidden", mode !== "signup");
  if (authAccountPanel) authAccountPanel.classList.add("hidden");
  showAuthStatus("");
}

function renderAuthPanels() {
  const user = auth.currentUser;
  if (user) {
    if (authTabsContainer) authTabsContainer.classList.add("hidden");
    if (authLoginPanel) authLoginPanel.classList.add("hidden");
    if (authSignupPanel) authSignupPanel.classList.add("hidden");
    if (authAccountPanel) authAccountPanel.classList.remove("hidden");

    db.collection("users")
      .doc(user.uid)
      .get()
      .then(function (doc) {
        if (doc.exists) {
          const data = doc.data();
          if (accountUsername) accountUsername.textContent = data.username;
          if (accountEmail) accountEmail.textContent = data.email;
          if (accountKeySpan)
            accountKeySpan.textContent = data.accessKey || "—";
        }
      })
      .catch(function (error) {
        console.error("Error fetching user data:", error);
      });
  } else {
    if (authTabsContainer) authTabsContainer.classList.remove("hidden");
    setAuthMode("login");
  }
}

function openAuth() {
  if (!authOverlay) return;
  authOverlay.classList.add("active");
  authOverlay.setAttribute("aria-hidden", "false");
  renderAuthPanels();
}

function closeAuth() {
  if (!authOverlay) return;
  authOverlay.classList.remove("active");
  authOverlay.setAttribute("aria-hidden", "true");
  showAuthStatus("");
}

function handleLogin() {
  if (!loginEmailInput || !loginPasswordInput) return;
  const email = loginEmailInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    showAuthStatus("Enter both email and password.", "error");
    return;
  }

  if (!isValidGmail(email)) {
    showAuthStatus("Please use a valid Gmail address.", "error");
    return;
  }

  auth
    .signInWithEmailAndPassword(email, password)
    .then(function (userCredential) {
      showAuthStatus("Login successful!", "success");
      addHistory("account", "Logged in", email);
      loginEmailInput.value = "";
      loginPasswordInput.value = "";
      renderAuthPanels();
    })
    .catch(function (error) {
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        showAuthStatus("Invalid email or password.", "error");
      } else {
        showAuthStatus("Login failed: " + error.message, "error");
      }
    });
}

function handleSignup() {
  if (!signupEmailInput || !signupUsernameInput || !signupPasswordInput) return;
  const email = signupEmailInput.value.trim().toLowerCase();
  const username = signupUsernameInput.value.trim();
  const password = signupPasswordInput.value;

  if (!email || !username || !password) {
    showAuthStatus("Fill email, username and password.", "error");
    return;
  }

  if (!isValidGmail(email)) {
    showAuthStatus("Please use a valid Gmail address.", "error");
    return;
  }

  if (password.length < 5) {
    showAuthStatus("Password should be at least 5 characters.", "error");
    return;
  }

  db.collection("users")
    .where("email", "==", email)
    .get()
    .then(function (querySnapshot) {
      if (!querySnapshot.empty) {
        showAuthStatus("Email already registered.", "error");
        return;
      }

      db.collection("users")
        .where("username", "==", username)
        .get()
        .then(function (querySnapshot) {
          if (!querySnapshot.empty) {
            showAuthStatus("Username already taken.", "error");
            return;
          }

          auth
            .createUserWithEmailAndPassword(email, password)
            .then(function (userCredential) {
              const user = userCredential.user;
              const accessKey = generateAccountKey();

              return user
                .updateProfile({
                  displayName: username,
                })
                .then(function () {
                  return db.collection("users").doc(user.uid).set({
                    email: email,
                    username: username,
                    password: password,
                    accessKey: accessKey,
                    status: "online",
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                  });
                });
            })
            .then(function () {
              showAuthStatus("Signup successful!", "success");
              addHistory("account", "Account created", email);
              signupEmailInput.value = "";
              signupUsernameInput.value = "";
              signupPasswordInput.value = "";
              renderAuthPanels();
            })
            .catch(function (error) {
              if (error.code === "auth/email-already-in-use") {
                showAuthStatus("Email already registered.", "error");
              } else {
                showAuthStatus("Signup failed: " + error.message, "error");
              }
            });
        })
        .catch(function (error) {
          showAuthStatus("Error checking username: " + error.message, "error");
        });
    })
    .catch(function (error) {
      showAuthStatus("Error checking email: " + error.message, "error");
    });
}

function showPasswordReset() {
  if (!getCurrentAuth()) {
    showAuthStatus("You must be logged in to reset your password.", "error");
    return;
  }
  if (passwordResetOverlay) {
    passwordResetOverlay.classList.remove("hidden");
  }
  if (authAccountPanel) {
    authAccountPanel.classList.add("blurred");
  }
  if (passwordResetNewInput) {
    passwordResetNewInput.value = "";
    passwordResetNewInput.focus();
  }
}

function closePasswordReset() {
  if (passwordResetOverlay) {
    passwordResetOverlay.classList.add("hidden");
  }
  if (authAccountPanel) {
    authAccountPanel.classList.remove("blurred");
  }
  if (passwordResetCurrentInput) passwordResetCurrentInput.value = "";
  if (passwordResetNewInput) passwordResetNewInput.value = "";
  showAuthStatus("");
}

function handlePasswordReset() {
  const user = auth.currentUser;
  if (!user) {
    showAuthStatus("You must be logged in to reset your password.", "error");
    return;
  }
  if (!passwordResetCurrentInput || !passwordResetNewInput) return;

  const currentPassword = passwordResetCurrentInput.value.trim();
  const newPassword = passwordResetNewInput.value.trim();

  if (!currentPassword) {
    showAuthStatus("Enter your current password first.", "error");
    return;
  }

  if (newPassword.length < 5) {
    showAuthStatus("New password must be at least 5 characters.", "error");
    return;
  }

  const credential = firebase.auth.EmailAuthProvider.credential(
    user.email,
    currentPassword,
  );
  user
    .reauthenticateWithCredential(credential)
    .then(function () {
      return user.updatePassword(newPassword);
    })
    .then(function () {
      return db.collection("users").doc(user.uid).update({
        password: newPassword,
      });
    })
    .then(function () {
      showAuthStatus("Password reset successfully!", "success");
      addHistory("account", "Password reset", "");
      passwordResetCurrentInput.value = "";
      passwordResetNewInput.value = "";
      closePasswordReset();
    })
    .catch(function (error) {
      if (error.code === "auth/wrong-password") {
        showAuthStatus("Current password is incorrect.", "error");
      } else {
        showAuthStatus("Password reset failed: " + error.message, "error");
      }
    });
}

function handleDeleteAccount() {
  const user = auth.currentUser;
  if (!user) {
    showAuthStatus("No active account to delete.", "error");
    return;
  }

  const confirmed = window.confirm(
    "Delete your account permanently? This cannot be undone.",
  );
  if (!confirmed) return;

  db.collection("users")
    .doc(user.uid)
    .delete()
    .then(function () {
      const batch = db.batch();

      db.collection("users")
        .doc(user.uid)
        .collection("friends")
        .get()
        .then(function (snapshot) {
          snapshot.forEach(function (doc) {
            const friendId = doc.id;
            batch.delete(
              db
                .collection("users")
                .doc(user.uid)
                .collection("friends")
                .doc(friendId),
            );
            batch.delete(
              db
                .collection("users")
                .doc(friendId)
                .collection("friends")
                .doc(user.uid),
            );
          });
        });

      db.collection("friendRequests")
        .where("fromUserId", "==", user.uid)
        .get()
        .then(function (snapshot) {
          snapshot.forEach(function (doc) {
            batch.delete(doc.ref);
          });
        });

      db.collection("friendRequests")
        .where("toUserId", "==", user.uid)
        .get()
        .then(function (snapshot) {
          snapshot.forEach(function (doc) {
            batch.delete(doc.ref);
          });
        });

      db.collection("conversations")
        .listDocuments()
        .then(function (docs) {
          docs.forEach(function (docRef) {
            docRef
              .collection("messages")
              .where("senderId", "==", user.uid)
              .get()
              .then(function (snapshot) {
                snapshot.forEach(function (doc) {
                  batch.delete(doc.ref);
                });
              });
          });
        });

      return batch.commit();
    })
    .then(function () {
      return user.delete();
    })
    .then(function () {
      addHistory("account", "Account deleted", "");
      showAuthStatus("Account deleted. You are now logged out.", "success");
      setAuthMode("login");
    })
    .catch(function (error) {
      showAuthStatus("Delete failed: " + error.message, "error");
    });
}

function handleLogout() {
  auth
    .signOut()
    .then(function () {
      addHistory("account", "Logged out", "");
      showAuthStatus("Logged out.", "success");
      setAuthMode("login");
    })
    .catch(function (error) {
      showAuthStatus("Logout failed: " + error.message, "error");
    });
}

if (resetPasswordBtn) {
  resetPasswordBtn.addEventListener("click", showPasswordReset);
}
if (confirmResetBtn) {
  confirmResetBtn.addEventListener("click", handlePasswordReset);
}
if (cancelResetBtn) {
  cancelResetBtn.addEventListener("click", closePasswordReset);
}
if (deleteAccountButton) {
  deleteAccountButton.addEventListener("click", handleDeleteAccount);
}

if (settingsBtn && settingsOverlay && settingsClose) {
  settingsBtn.addEventListener("click", openSettings);
  settingsClose.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", (event) => {
    if (event.target === settingsOverlay) {
      closeSettings();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      document.body.classList.contains("settings-open")
    ) {
      closeSettings();
    }
  });
  window.addEventListener("online", () => setInfoValue("status", "Online"));
  window.addEventListener("offline", () => setInfoValue("status", "Offline"));
}

document.querySelectorAll(".eye-toggle").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const toggleType = btn.dataset.toggle;
    const display = document.querySelector("." + toggleType + "-display");
    if (!display) return;

    const isHidden = display.textContent.includes("•");
    const actualValue = display.dataset.actual || "";

    if (isHidden) {
      display.textContent = actualValue || "—";
      btn.querySelector(".material-icons").textContent = "visibility_off";
    } else {
      display.textContent = maskString(actualValue);
      btn.querySelector(".material-icons").textContent = "visibility";
    }
  });
});

if (loginButton) {
  loginButton.addEventListener("click", openAuth);
}

if (authClose && authOverlay) {
  authClose.addEventListener("click", closeAuth);
  authOverlay.addEventListener("click", (event) => {
    if (event.target === authOverlay) closeAuth();
  });
}

if (passwordResetOverlay) {
  passwordResetOverlay.addEventListener("click", (event) => {
    if (event.target === passwordResetOverlay) closePasswordReset();
  });
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
});

const loginSubmit = document.getElementById("login-submit");
const signupSubmit = document.getElementById("signup-submit");

if (loginSubmit) loginSubmit.addEventListener("click", handleLogin);
if (signupSubmit) signupSubmit.addEventListener("click", handleSignup);
if (logoutButton) logoutButton.addEventListener("click", handleLogout);

const settingsReset = document.querySelector(".settings-reset");

if (settingsSave) {
  settingsSave.addEventListener("click", () => {
    try {
      const enabled = !!(antiEnabled && antiEnabled.checked);
      localStorage.setItem("antiEnabled", enabled ? "1" : "0");
      const actionSel = document.getElementById("anti-action-select");
      if (actionSel)
        localStorage.setItem("antiAction", actionSel.value || "newtab");
      if (antiUrlInput)
        localStorage.setItem("antiUrl", antiUrlInput.value || "");

      if (
        keybindDisplay &&
        keybindDisplay.textContent &&
        keybindDisplay.textContent !== "None" &&
        keybindDisplay.textContent !== "Press any key..."
      ) {
        saveKeybind(keybindDisplay.textContent);
      } else {
        try {
          localStorage.removeItem("antiKeybind");
        } catch (e) { }
      }

      const actionSel2 = document.getElementById("anti-action-select");
      addHistory(
        "settings",
        "Anti-teacher settings saved",
        "Enabled: " +
        (enabled ? "yes" : "no") +
        (actionSel2 ? ", action: " + actionSel2.value : ""),
      );

      closeSettings();
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  });
}

function resetAntiSettings() {
  try {
    localStorage.removeItem("antiEnabled");
    localStorage.removeItem("antiKeybind");
    localStorage.removeItem("antiUrl");
    localStorage.removeItem("antiAction");
    localStorage.removeItem("antiImages");
  } catch (e) {
    console.error("Failed to clear settings", e);
  }

  if (antiEnabled) antiEnabled.checked = false;
  const controls = document.querySelector(".anti-controls");
  if (controls) controls.classList.add("hidden");
  if (antiImagesRow) antiImagesRow.style.display = "none";
  if (keybindDisplay) keybindDisplay.textContent = "None";
  if (antiUrlInput) antiUrlInput.value = "";
  const sel = document.getElementById("anti-action-select");
  if (sel) sel.value = "newtab";
  renderImagesInputs();
}

if (settingsReset) {
  settingsReset.addEventListener("click", () => {
    let userConfirmed = confirm(
      "Are you sure you want to reset every setting?",
    );
    if (userConfirmed) {
      resetAntiSettings();
    }
  });
}

const antiEnabled = document.getElementById("anti-enabled");
const setKeybindBtn = document.getElementById("set-keybind");
const keybindDisplay = document.getElementById("keybind-display");
const antiUrlRow = document.getElementById("anti-url-row");
const antiUrlInput = document.getElementById("anti-url");
const clearKeybindBtn = document.getElementById("clear-keybind");

function saveAntiState(enabled) {
  try {
    localStorage.setItem("antiEnabled", enabled ? "1" : "0");
  } catch (e) { }
}

function saveKeybind(value) {
  try {
    localStorage.setItem("antiKeybind", value || "");
  } catch (e) { }
}

function saveAntiUrl(url) {
  try {
    localStorage.setItem("antiUrl", url || "");
  } catch (e) { }
}

function formatKeyEvent(e) {
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (!["Control", "Shift", "Alt", "Meta"].includes(key)) parts.push(key);
  return parts.join("+");
}

let listeningForKey = false;

function startKeyCapture() {
  listeningForKey = true;
  keybindDisplay.textContent = "Press any key...";
  function handler(ev) {
    ev.preventDefault();
    const combo = formatKeyEvent(ev);
    keybindDisplay.textContent = combo || "None";
    saveKeybind(combo);
    document.removeEventListener("keydown", handler, true);
    listeningForKey = false;
  }
  document.addEventListener("keydown", handler, true);
}

if (clearKeybindBtn) {
  clearKeybindBtn.addEventListener("click", () => {
    saveKeybind("");
    try {
      localStorage.removeItem("antiKeybind");
    } catch (e) { }
    if (keybindDisplay) keybindDisplay.textContent = "None";
  });
}

if (
  antiEnabled &&
  setKeybindBtn &&
  keybindDisplay &&
  antiUrlRow &&
  antiUrlInput
) {
  antiEnabled.addEventListener("change", (e) => {
    const enabled = !!e.target.checked;
    const controls = document.querySelector(".anti-controls");
    if (controls) controls.classList.toggle("hidden", !enabled);
    if (antiUrlRow) antiUrlRow.style.display = enabled ? "flex" : "none";
    if (antiActionRow) antiActionRow.style.display = enabled ? "flex" : "none";
    const action = localStorage.getItem("antiAction") || "newtab";
    if (antiImagesRow)
      antiImagesRow.style.display =
        enabled && action === "images" ? "block" : "none";
    saveAntiState(enabled);
  });

  setKeybindBtn.addEventListener("click", () => {
    if (listeningForKey) return;
    startKeyCapture();
  });

  antiUrlInput.addEventListener("input", (e) => saveAntiUrl(e.target.value));

  document.addEventListener("keydown", (e) => {
    const combo = formatKeyEvent(e);
    const stored = localStorage.getItem("antiKeybind") || "";
    const enabled = localStorage.getItem("antiEnabled") === "1";
    const url = localStorage.getItem("antiUrl") || "";
    if (enabled && stored && combo === stored) {
      const action = localStorage.getItem("antiAction") || "newtab";
      if (action === "newtab") {
        if (url) window.open(url, "_blank");
      } else if (action === "replace") {
        if (url) window.location.href = url;
      } else if (action === "images") {
        const imagesJSON = localStorage.getItem("antiImages") || "[]";
        let images = [];
        try {
          images = JSON.parse(imagesJSON);
        } catch (e) {
          images = [];
        }
        if (images && images.length) {
          showAntiOverlay(images);
        }
      }
    }
  });
}

function showAntiOverlay(images) {
  const overlay = document.createElement("div");
  overlay.className = "anti-overlay";
  overlay.tabIndex = -1;

  const closeBtn = document.createElement("button");
  closeBtn.className = "anti-close";
  closeBtn.innerHTML = "Close";
  overlay.appendChild(closeBtn);

  let idx = 0;
  const img = document.createElement("img");
  img.src = images[idx];
  overlay.appendChild(img);

  function next() {
    idx = (idx + 1) % images.length;
    img.src = images[idx];
  }

  function prev() {
    idx = (idx - 1 + images.length) % images.length;
    img.src = images[idx];
  }

  img.addEventListener("click", next);
  closeBtn.addEventListener("click", function () {
    removeOverlay();
  });
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) removeOverlay();
  });
  document.addEventListener("keydown", overlayKeyHandler);

  function overlayKeyHandler(e) {
    if (e.key === "Escape") removeOverlay();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  }

  function removeOverlay() {
    try {
      document.body.removeChild(overlay);
    } catch (e) { }
    document.removeEventListener("keydown", overlayKeyHandler);
  }

  document.body.appendChild(overlay);
}

const addImageBtn = document.getElementById("add-image-btn");
const imagesContainer = document.getElementById("anti-images-container");

function renderImagesInputs() {
  if (!imagesContainer) return;
  imagesContainer.innerHTML = "";
  const imagesJSON = localStorage.getItem("antiImages") || "[]";
  let images = [];
  try {
    images = JSON.parse(imagesJSON);
  } catch (e) {
    images = [];
  }
  images.forEach(function (src, i) {
    const row = document.createElement("div");
    row.className = "image-row";
    const input = document.createElement("input");
    input.type = "text";
    input.value = src;
    input.addEventListener("input", function () {
      saveImageAt(i, input.value);
    });
    const rem = document.createElement("button");
    rem.className = "remove-img";
    rem.textContent = "Remove";
    rem.addEventListener("click", function () {
      removeImageAt(i);
    });
    row.appendChild(input);
    row.appendChild(rem);
    imagesContainer.appendChild(row);
  });
}

function saveImageAt(index, val) {
  const imagesJSON = localStorage.getItem("antiImages") || "[]";
  let images = [];
  try {
    images = JSON.parse(imagesJSON);
  } catch (e) {
    images = [];
  }
  images[index] = val;
  localStorage.setItem("antiImages", JSON.stringify(images));
  renderImagesInputs();
}

function removeImageAt(index) {
  const imagesJSON = localStorage.getItem("antiImages") || "[]";
  let images = [];
  try {
    images = JSON.parse(imagesJSON);
  } catch (e) {
    images = [];
  }
  images.splice(index, 1);
  localStorage.setItem("antiImages", JSON.stringify(images));
  renderImagesInputs();
}

if (addImageBtn && imagesContainer) {
  addImageBtn.addEventListener("click", () => {
    const imagesJSON = localStorage.getItem("antiImages") || "[]";
    let images = [];
    try {
      images = JSON.parse(imagesJSON);
    } catch (e) {
      images = [];
    }
    images.push("");
    localStorage.setItem("antiImages", JSON.stringify(images));
    renderImagesInputs();
  });
}

const antiActionRow = document.getElementById("anti-action-row");
const antiImagesRow = document.getElementById("anti-images-row");

function loadAntiSettings() {
  const enabled = localStorage.getItem("antiEnabled") === "1";
  const key = localStorage.getItem("antiKeybind") || "";
  const url = localStorage.getItem("antiUrl") || "";
  const action = localStorage.getItem("antiAction") || "newtab";
  if (antiEnabled) {
    antiEnabled.checked = enabled;
    const controls = document.querySelector(".anti-controls");
    if (controls) controls.classList.toggle("hidden", !enabled);
    if (antiUrlRow) antiUrlRow.style.display = enabled ? "flex" : "none";
    if (antiActionRow) antiActionRow.style.display = enabled ? "flex" : "none";
    if (antiImagesRow)
      antiImagesRow.style.display =
        enabled && action === "images" ? "block" : "none";
  }
  if (keybindDisplay) keybindDisplay.textContent = key || "None";
  if (antiUrlInput) antiUrlInput.value = url;

  const sel = document.getElementById("anti-action-select");
  if (sel) sel.value = action;
  renderImagesInputs();
}

const antiActionSelect = document.getElementById("anti-action-select");
if (antiActionSelect) {
  antiActionSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    localStorage.setItem("antiAction", val);
    if (antiImagesRow)
      antiImagesRow.style.display =
        val === "images" && antiEnabled && antiEnabled.checked
          ? "block"
          : "none";
  });
}

if (antiUrlInput) {
  antiUrlInput.addEventListener("input", (e) => saveAntiUrl(e.target.value));
}

loadAntiSettings();

// ── History system ────────────────────────────────────────────────────────────
const HISTORY_MAX = 200;

function historyEnabled() {
  return localStorage.getItem("historyEnabled") !== "0";
}
function historyTypeEnabled(type) {
  return localStorage.getItem("historyType_" + type) !== "0";
}
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("siteHistory") || "[]");
  } catch (e) {
    return [];
  }
}
function saveHistory(arr) {
  localStorage.setItem("siteHistory", JSON.stringify(arr));
}
function addHistory(type, action, detail) {
  if (!historyEnabled()) return;
  if (!historyTypeEnabled(type)) return;
  const arr = getHistory();
  arr.unshift({ type, action, detail: detail || "", ts: Date.now() });
  if (arr.length > HISTORY_MAX) arr.length = HISTORY_MAX;
  saveHistory(arr);
  if (
    document.getElementById("history") &&
    document.getElementById("history").classList.contains("active")
  ) {
    renderHistory();
  }
}
function clearHistory() {
  localStorage.removeItem("siteHistory");
  renderHistory();
}
function historyIcon(type) {
  return (
    {
      account: "person",
      game: "sports_esports",
      settings: "settings",
      message: "chat",
    }[type] || "history"
  );
}
function historyTimeLabel(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  const d = new Date(ts);
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}
function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;
  if (!historyEnabled()) {
    list.innerHTML = "<p>History is disabled. Enable it in Settings.</p>";
    return;
  }
  const arr = getHistory();
  if (!arr.length) {
    list.innerHTML = "<p>No history yet.</p>";
    return;
  }
  list.innerHTML = "";
  arr.forEach(function (item) {
    const el = document.createElement("div");
    el.className = "history-item type-" + item.type;
    const icon = document.createElement("span");
    icon.className = "history-icon material-icons";
    icon.textContent = historyIcon(item.type);
    item.action == "Logged out" && (icon.style.transform = "translateY(1px)");
    const body = document.createElement("div");
    body.className = "history-body";
    const action = document.createElement("span");
    action.className = "history-action";
    action.textContent = item.action;
    body.appendChild(action);
    if (item.detail) {
      const detail = document.createElement("span");
      detail.className = "history-detail";
      detail.textContent = item.detail;
      body.appendChild(detail);
    }
    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = historyTimeLabel(item.ts);
    el.appendChild(icon);
    el.appendChild(body);
    el.appendChild(time);
    list.appendChild(el);
  });
}
let historySettingsInitialized = false;
function loadHistorySettings() {
  const hEnabled = document.getElementById("history-enabled");
  const hAccount = document.getElementById("history-account");
  const hGames = document.getElementById("history-games");
  const hSett = document.getElementById("history-settings");
  const hMsg = document.getElementById("history-messages");
  const hSub = document.getElementById("history-sub-controls");
  if (!hEnabled) return;

  // Sync checkbox states with localStorage every time settings opens
  hEnabled.checked = historyEnabled();
  if (hAccount) hAccount.checked = historyTypeEnabled("account");
  if (hGames) hGames.checked = historyTypeEnabled("game");
  if (hSett) hSett.checked = historyTypeEnabled("settings");
  if (hMsg) hMsg.checked = historyTypeEnabled("message");
  if (hSub) hSub.classList.toggle("hidden", !historyEnabled());

  // Only wire up event listeners once
  if (historySettingsInitialized) return;
  historySettingsInitialized = true;

  hEnabled.addEventListener("change", function () {
    localStorage.setItem("historyEnabled", hEnabled.checked ? "1" : "0");
    if (hSub) hSub.classList.toggle("hidden", !hEnabled.checked);
  });
  [
    [hAccount, "account"],
    [hGames, "game"],
    [hSett, "settings"],
    [hMsg, "message"],
  ].forEach(function (pair) {
    if (!pair[0]) return;
    pair[0].addEventListener("change", function () {
      localStorage.setItem(
        "historyType_" + pair[1],
        pair[0].checked ? "1" : "0",
      );
    });
  });
  const clearBtn = document.getElementById("clear-history-btn");
  if (clearBtn) clearBtn.addEventListener("click", clearHistory);
}

// Load history settings whenever the settings dialog opens
if (settingsBtn) {
  settingsBtn.addEventListener("click", loadHistorySettings);
}
// Render history immediately if it's already the active tab on page load
if (getCurrentActiveTabId() === "history") {
  renderHistory();
}
// ── End history system ─────────────────────────────────────────────────────────

updateAuthBadge();

let currentUserStatus = "online";
let currentChatUserId = null;
let currentChatUsername = null;
let statusHeartbeatInterval = null;
let usersListener = null;
let friendsListener = null;
let requestsListener = null;
let messagesListener = null;
let selectedMessageImageFile = null;
let selectedMessageImagePreviewUrl = null;
let isSendingMessage = false;
const MAX_MESSAGE_IMAGE_SIZE = 500 * 1024; // 500 KB

const statusSelect = document.getElementById("status-select");
const socialTabs = document.querySelectorAll(".social-tab");
const socialPanels = document.querySelectorAll(".social-panel");
const userSearchInput = document.getElementById("user-search");
const allUsersList = document.getElementById("all-users-list");
const friendsList = document.getElementById("friends-list");
const requestsList = document.getElementById("requests-list");
const socialRefreshBtn = document.getElementById("social-refresh-btn");
const messageOverlay = document.querySelector(".message-overlay");
const messageClose = document.querySelector(".message-close");
const messageRecipientName = document.getElementById("message-recipient-name");
const messageRecipientStatus = document.getElementById(
  "message-recipient-status",
);
const messagesContainer = document.getElementById("messages-container");
const messageInput = document.getElementById("message-input");
const sendMessageBtn = document.getElementById("send-message-btn");
const attachImageBtn = document.getElementById("attach-image-btn");
const messageImageInput = document.getElementById("message-image-input");
const messageAttachmentPreview = document.getElementById(
  "message-attachment-preview",
);
const messageAttachmentImage = document.getElementById(
  "message-attachment-image",
);
const messageAttachmentName = document.getElementById(
  "message-attachment-name",
);
const removeMessageAttachment = document.getElementById(
  "remove-message-attachment",
);
const messageBack = document.querySelector(".message-back");
const messageMain = document.getElementById("message-main");
const messageChat = document.getElementById("message-chat");
const messagesFriendsList = document.getElementById("messages-friends-list");
const messageTitle = document.getElementById("message-title");
const profileOverlay = document.querySelector(".profile-overlay");
const profileClose = document.querySelector(".profile-close");
const profileAvatar = document.getElementById("profile-avatar");
const profileUsername = document.getElementById("profile-username");
const profileEmail = document.getElementById("profile-email");
const profileStatus = document.getElementById("profile-status");
const profileStatusText = document.getElementById("profile-status-text");
const profileJoined = document.getElementById("profile-joined");
const profileActions = document.getElementById("profile-actions");
let currentProfileUserId = null;

auth.onAuthStateChanged(function (user) {
  if (user) {
    initializeSocialFeatures(user);
  } else {
    cleanupSocialFeatures();
  }
});

function initializeSocialFeatures(user) {
  const storedStatus = localStorage.getItem("userStatus");
  if (storedStatus) {
    currentUserStatus = storedStatus;
    if (statusSelect) statusSelect.value = currentUserStatus;
    startStatusHeartbeat(user);
  } else {
    db.collection("users")
      .doc(user.uid)
      .get()
      .then(function (doc) {
        if (doc.exists && doc.data().status) {
          currentUserStatus = doc.data().status;
          if (statusSelect) statusSelect.value = currentUserStatus;
          localStorage.setItem("userStatus", currentUserStatus);
        }
      })
      .catch(function (error) {
        console.error("Error loading user status:", error);
      })
      .finally(function () {
        startStatusHeartbeat(user);
      });
  }

  setupSocialTabs(user);

  setupUserSearch();

  loadSocialData(user);

  setupMessageDialog();

  setupProfileDialog();

  if (socialRefreshBtn) {
    socialRefreshBtn.addEventListener("click", function () {
      socialRefreshBtn.classList.add("spinning");
      socialRefreshBtn.addEventListener(
        "animationend",
        function () {
          socialRefreshBtn.classList.remove("spinning");
        },
        { once: true },
      );
      loadSocialData(user);
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener("change", function (e) {
      currentUserStatus = e.target.value;
      localStorage.setItem("userStatus", currentUserStatus);
      updateUserStatus(user);
    });
  }
}

function cleanupSocialFeatures() {
  if (statusHeartbeatInterval) {
    clearInterval(statusHeartbeatInterval);
    statusHeartbeatInterval = null;
  }
  if (usersListener) {
    usersListener();
    usersListener = null;
  }
  if (friendsListener) {
    friendsListener();
    friendsListener = null;
  }
  if (requestsListener) {
    requestsListener();
    requestsListener = null;
  }
  if (messagesListener) {
    messagesListener();
    messagesListener = null;
  }
  currentChatUserId = null;
  currentChatUsername = null;
}

function startStatusHeartbeat(user) {
  if (statusHeartbeatInterval) {
    clearInterval(statusHeartbeatInterval);
  }

  updateUserStatus(user);

  statusHeartbeatInterval = setInterval(function () {
    updateUserStatus(user);
  }, 5000);

  window.addEventListener("beforeunload", function () {
    db.collection("users").doc(user.uid).update({
      status: "offline",
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });
}

function updateUserStatus(user) {
  db.collection("users")
    .doc(user.uid)
    .update({
      status: currentUserStatus,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
    })
    .then(function () {
      return db.collection("users").doc(user.uid).collection("friends").get();
    })
    .then(function (snapshot) {
      if (snapshot.empty) return;
      const batch = db.batch();
      snapshot.forEach(function (doc) {
        batch.set(
          db
            .collection("users")
            .doc(doc.id)
            .collection("friends")
            .doc(user.uid),
          { status: currentUserStatus },
          { merge: true },
        );
      });
      return batch.commit();
    })
    .catch(function (error) {
      console.error("Error updating status:", error);
    });
}

function setupSocialTabs(user) {
  socialTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      const targetTab = tab.dataset.tab;

      socialTabs.forEach(function (t) {
        t.classList.remove("active");
      });
      tab.classList.add("active");

      socialPanels.forEach(function (panel) {
        panel.classList.remove("active");
      });
      document.getElementById(targetTab + "-panel").classList.add("active");

      if (user) {
        loadSocialData(user);
      }
    });
  });
}

function setupUserSearch() {
  if (userSearchInput) {
    userSearchInput.addEventListener("input", function (e) {
      const searchTerm = e.target.value.toLowerCase();
      filterUsers(searchTerm);
    });
  }
}

function loadSocialData(user) {
  loadAllUsers(user);
  loadFriends(user);
  loadFriendRequests(user);
}

function loadAllUsers(user) {
  if (usersListener) {
    usersListener();
    usersListener = null;
  }

  if (allUsersList) allUsersList.innerHTML = "<p>Loading...</p>";

  db.collection("users")
    .get()
    .then(function (snapshot) {
      const users = [];
      snapshot.forEach(function (doc) {
        const userData = doc.data();
        if (doc.id !== user.uid) {
          users.push({ id: doc.id, ...userData });
        }
      });
      renderAllUsers(users, user);
    })
    .catch(function (error) {
      console.error("Error loading users:", error);
      if (allUsersList) allUsersList.innerHTML = "<p>Error loading users.</p>";
    });
}

function renderAllUsers(users, currentUser) {
  if (!allUsersList) return;

  if (users.length === 0) {
    allUsersList.innerHTML = "<p>No other users found.</p>";
    return;
  }

  const searchTerm = userSearchInput ? userSearchInput.value.toLowerCase() : "";
  const filteredUsers = users.filter(function (user) {
    return (
      user.username.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  });

  if (filteredUsers.length === 0) {
    allUsersList.innerHTML = "<p>No users match your search.</p>";
    return;
  }

  allUsersList.innerHTML = "";
  filteredUsers.forEach(function (user) {
    const userCard = createUserCard(user, currentUser, "all");
    allUsersList.appendChild(userCard);
  });
}

function filterUsers(searchTerm) {
  const user = auth.currentUser;
  if (!user) return;

  db.collection("users")
    .get()
    .then(function (snapshot) {
      const users = [];
      snapshot.forEach(function (doc) {
        const userData = doc.data();
        if (doc.id !== user.uid) {
          users.push({
            id: doc.id,
            ...userData,
          });
        }
      });
      renderAllUsers(users, user);
    })
    .catch(function (error) {
      console.error("Error filtering users:", error);
    });
}

function loadFriends(user) {
  if (friendsListener) {
    friendsListener();
    friendsListener = null;
  }

  if (friendsList) friendsList.innerHTML = "<p>Loading...</p>";

  db.collection("users")
    .doc(user.uid)
    .collection("friends")
    .get()
    .then(function (snapshot) {
      const friends = [];
      snapshot.forEach(function (doc) {
        friends.push({ id: doc.id, ...doc.data() });
      });
      renderFriends(friends);
    })
    .catch(function (error) {
      console.error("Error loading friends:", error);
      if (friendsList) friendsList.innerHTML = "<p>Error loading friends.</p>";
    });
}

function renderFriends(friends) {
  if (!friendsList) return;

  if (friends.length === 0) {
    friendsList.innerHTML = "<p>No friends yet. Add some!</p>";
    return;
  }

  friendsList.innerHTML = "";
  friends.forEach(function (friend) {
    const user = auth.currentUser;
    const friendCard = createUserCard(friend, user, "friend");
    friendsList.appendChild(friendCard);
  });
}

function loadFriendRequests(user) {
  if (requestsListener) {
    requestsListener();
    requestsListener = null;
  }

  if (requestsList) requestsList.innerHTML = "<p>Loading...</p>";

  db.collection("friendRequests")
    .where("toUserId", "==", user.uid)
    .where("status", "==", "pending")
    .get()
    .then(function (snapshot) {
      const requests = [];
      snapshot.forEach(function (doc) {
        requests.push({ id: doc.id, ...doc.data() });
      });
      renderFriendRequests(requests);
    })
    .catch(function (error) {
      console.error("Error loading friend requests:", error);
      if (requestsList)
        requestsList.innerHTML = "<p>Error loading requests.</p>";
    });
}

function renderFriendRequests(requests) {
  if (!requestsList) return;

  if (requests.length === 0) {
    requestsList.innerHTML = "<p>No pending friend requests.</p>";
    return;
  }

  requestsList.innerHTML = "";
  requests.forEach(function (request) {
    const requestCard = createFriendRequestCard(request);
    requestsList.appendChild(requestCard);
  });
}

function createUserCard(user, currentUser, context) {
  const card = document.createElement("div");
  card.className = "user-card";

  const avatar = document.createElement("div");
  avatar.className = "user-avatar";
  avatar.textContent = user.username.charAt(0).toUpperCase();

  const info = document.createElement("div");
  info.className = "user-info";

  const details = document.createElement("div");
  details.className = "user-details";

  const name = document.createElement("div");
  name.className = "user-name";
  name.textContent = user.username;

  const email = document.createElement("div");
  email.className = "user-email";
  email.textContent = user.email;

  details.appendChild(name);
  details.appendChild(email);

  const status = createUserStatusIndicator(user.status || "offline");

  info.appendChild(avatar);
  info.appendChild(details);

  const actions = document.createElement("div");
  actions.className = "user-actions";

  card.addEventListener("click", function (e) {
    if (!e.target.closest(".action-btn")) {
      openProfileDialog(user, context);
    }
  });

  if (context === "all") {
    db.collection("users")
      .doc(currentUser.uid)
      .collection("friends")
      .doc(user.id)
      .get()
      .then(function (doc) {
        if (doc.exists) {
          const messageBtn = document.createElement("button");
          messageBtn.className = "action-btn primary";
          messageBtn.textContent = "Message";
          messageBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            openMessageDialog(user);
          });
          actions.appendChild(messageBtn);

          const removeFriendBtn = document.createElement("button");
          removeFriendBtn.className = "action-btn danger";
          removeFriendBtn.textContent = "Remove";
          removeFriendBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            removeFriend(currentUser, user.id);
          });
          actions.appendChild(removeFriendBtn);
        } else {
          db.collection("friendRequests")
            .where("fromUserId", "==", currentUser.uid)
            .where("toUserId", "==", user.id)
            .where("status", "==", "pending")
            .get()
            .then(function (querySnapshot) {
              if (querySnapshot.empty) {
                const sendRequestBtn = document.createElement("button");
                sendRequestBtn.className = "action-btn primary";
                sendRequestBtn.textContent = "Add Friend";
                sendRequestBtn.addEventListener("click", function (e) {
                  e.stopPropagation();
                  sendFriendRequest(currentUser, user);
                });
                actions.appendChild(sendRequestBtn);
              } else {
                const pendingBtn = document.createElement("button");
                pendingBtn.className = "action-btn secondary";
                pendingBtn.textContent = "Pending";
                pendingBtn.disabled = true;
                actions.appendChild(pendingBtn);
              }
            });
        }
      });
  } else if (context === "friend") {
    const messageBtn = document.createElement("button");
    messageBtn.className = "action-btn primary";
    messageBtn.textContent = "Message";
    messageBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openMessageDialog(user);
    });
    actions.appendChild(messageBtn);

    const removeFriendBtn = document.createElement("button");
    removeFriendBtn.className = "action-btn danger";
    removeFriendBtn.textContent = "Remove";
    removeFriendBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      removeFriend(currentUser, user.id);
    });
    actions.appendChild(removeFriendBtn);
  }

  card.appendChild(info);
  card.appendChild(status);
  card.appendChild(actions);

  return card;
}

function createUserStatusIndicator(status) {
  const indicator = document.createElement("span");
  indicator.className = "status-indicator " + status;

  const dot = document.createElement("span");
  dot.className = "status-dot";

  const text = document.createElement("span");
  text.textContent = status.charAt(0).toUpperCase() + status.slice(1);

  indicator.appendChild(dot);
  indicator.appendChild(text);

  return indicator;
}

function createFriendRequestCard(request) {
  const card = document.createElement("div");
  card.className = "user-card";

  const info = document.createElement("div");
  info.className = "user-info";

  const avatar = document.createElement("div");
  avatar.className = "user-avatar";
  avatar.textContent = (request.fromUsername || "U").charAt(0).toUpperCase();

  const details = document.createElement("div");
  details.className = "user-details";

  const name = document.createElement("div");
  name.className = "user-name";
  name.textContent = request.fromUsername || "Unknown";

  const email = document.createElement("div");
  email.className = "user-email";
  email.textContent = request.fromEmail || "";

  details.appendChild(name);
  details.appendChild(email);

  info.appendChild(avatar);
  info.appendChild(details);

  const actions = document.createElement("div");
  actions.className = "user-actions";

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "action-btn success";
  acceptBtn.textContent = "Accept";
  acceptBtn.addEventListener("click", function () {
    acceptFriendRequest(request);
  });

  const declineBtn = document.createElement("button");
  declineBtn.className = "action-btn danger";
  declineBtn.textContent = "Decline";
  declineBtn.addEventListener("click", function () {
    declineFriendRequest(request);
  });

  actions.appendChild(acceptBtn);
  actions.appendChild(declineBtn);

  card.appendChild(info);
  card.appendChild(actions);

  return card;
}

function sendFriendRequest(currentUser, targetUser) {
  db.collection("users")
    .doc(currentUser.uid)
    .get()
    .then(function (doc) {
      const userData = doc.data();
      const username = userData ? userData.username : "Unknown";

      return db.collection("friendRequests").add({
        fromUserId: currentUser.uid,
        fromUsername: username,
        fromEmail: currentUser.email,
        toUserId: targetUser.id,
        toUsername: targetUser.username,
        toEmail: targetUser.email,
        status: "pending",
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    })
    .then(function () {
      const user = auth.currentUser;
      if (user) {
        loadAllUsers(user);
      }
    })
    .catch(function (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send friend request.");
    });
}

function acceptFriendRequest(request) {
  const user = auth.currentUser;

  db.collection("users")
    .doc(user.uid)
    .get()
    .then(function (doc) {
      const userData = doc.data();
      const username = userData ? userData.username : "Unknown";

      const batch = db.batch();

      const senderFriendRef = db
        .collection("users")
        .doc(request.fromUserId)
        .collection("friends")
        .doc(user.uid);
      batch.set(senderFriendRef, {
        username: username,
        email: user.email,
        status: "online",
        addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      const recipientFriendRef = db
        .collection("users")
        .doc(user.uid)
        .collection("friends")
        .doc(request.fromUserId);
      batch.set(recipientFriendRef, {
        username: request.fromUsername,
        email: request.fromEmail,
        status: "online",
        addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      const requestRef = db.collection("friendRequests").doc(request.id);
      batch.update(requestRef, { status: "accepted" });

      return batch.commit();
    })
    .catch(function (error) {
      console.error("Error accepting friend request:", error);
      alert("Failed to accept friend request.");
    });
}

function declineFriendRequest(request) {
  db.collection("friendRequests")
    .doc(request.id)
    .update({
      status: "declined",
    })
    .catch(function (error) {
      console.error("Error declining friend request:", error);
      alert("Failed to decline friend request.");
    });
}

function removeFriend(currentUser, friendId) {
  const batch = db.batch();

  batch.delete(
    db
      .collection("users")
      .doc(currentUser.uid)
      .collection("friends")
      .doc(friendId),
  );
  batch.delete(
    db
      .collection("users")
      .doc(friendId)
      .collection("friends")
      .doc(currentUser.uid),
  );

  batch.commit().catch(function (error) {
    console.error("Error removing friend:", error);
    alert("Failed to remove friend.");
  });
}

function setupMessageDialog() {
  if (messageClose) {
    messageClose.addEventListener("click", closeMessageDialog);
  }

  if (messageBack) {
    messageBack.addEventListener("click", showMainMessagesView);
  }

  if (messageOverlay) {
    messageOverlay.addEventListener("click", function (event) {
      if (event.target === messageOverlay) {
        closeMessageDialog();
      }
    });
  }

  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", sendMessage);
  }

  if (attachImageBtn && messageImageInput) {
    attachImageBtn.addEventListener("click", function () {
      messageImageInput.click();
    });
  }

  if (messageImageInput) {
    messageImageInput.addEventListener("change", handleMessageImageSelect);
  }

  if (removeMessageAttachment) {
    removeMessageAttachment.addEventListener(
      "click",
      clearSelectedMessageImage,
    );
  }

  if (messageInput) {
    messageInput.addEventListener("keypress", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        sendMessage();
      }
    });
  }
}

function handleMessageImageSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    clearSelectedMessageImage();
    return;
  }

  if (file.size > MAX_MESSAGE_IMAGE_SIZE) {
    alert("Image is too large. Please choose an image under 5 MB.");
    clearSelectedMessageImage();
    return;
  }

  selectedMessageImageFile = file;
  if (selectedMessageImagePreviewUrl) {
    URL.revokeObjectURL(selectedMessageImagePreviewUrl);
  }
  selectedMessageImagePreviewUrl = URL.createObjectURL(file);

  if (messageAttachmentImage) {
    messageAttachmentImage.src = selectedMessageImagePreviewUrl;
  }
  if (messageAttachmentName) {
    messageAttachmentName.textContent = file.name;
  }
  if (messageAttachmentPreview) {
    messageAttachmentPreview.classList.remove("hidden");
  }
}

function clearSelectedMessageImage() {
  selectedMessageImageFile = null;
  if (selectedMessageImagePreviewUrl) {
    URL.revokeObjectURL(selectedMessageImagePreviewUrl);
    selectedMessageImagePreviewUrl = null;
  }
  if (messageImageInput) {
    messageImageInput.value = "";
  }
  if (messageAttachmentImage) {
    messageAttachmentImage.removeAttribute("src");
  }
  if (messageAttachmentName) {
    messageAttachmentName.textContent = "";
  }
  if (messageAttachmentPreview) {
    messageAttachmentPreview.classList.add("hidden");
  }
}

function setMessageSendingState(isSending) {
  isSendingMessage = isSending;
  if (sendMessageBtn) {
    sendMessageBtn.disabled = isSending;
    sendMessageBtn.textContent = isSending ? "Sending..." : "Send";
  }
  if (attachImageBtn) {
    attachImageBtn.disabled = isSending;
  }
  if (messageInput) {
    messageInput.disabled = isSending;
  }
}

function getSafeFileName(fileName) {
  return (fileName || "image").replace(/[^a-z0-9._-]/gi, "_");
}

function uploadMessageImage(conversationId, messageId, file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) {
      resolve({
        imageUrl: e.target.result,  // base64 data URL
        imagePath: null,
        imageName: file.name,
        imageType: file.type,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openMessageDialog(user) {
  currentChatUserId = user.id;
  currentChatUsername = user.username;

  if (messageRecipientName) {
    messageRecipientName.textContent = user.username;
  }

  if (messageRecipientStatus) {
    messageRecipientStatus.className =
      "status-indicator " + (user.status || "offline");
    messageRecipientStatus.innerHTML =
      '<span class="status-dot"></span>' +
      (user.status || "offline").charAt(0).toUpperCase() +
      (user.status || "offline").slice(1);
  }

  messageOverlay.classList.add("active");
  messageOverlay.setAttribute("aria-hidden", "false");

  clearSelectedMessageImage();
  showChatView();
  loadMessages();
}

function showChatView() {
  if (messageMain) messageMain.style.display = "none";
  if (messageChat) messageChat.style.display = "block";
  if (messageBack) messageBack.style.display = "block";
  if (messageTitle) messageTitle.style.display = "none";
}

function showMainMessagesView() {
  if (messageMain) messageMain.style.display = "block";
  if (messageChat) messageChat.style.display = "none";
  if (messageBack) messageBack.style.display = "none";
  if (messageTitle) messageTitle.style.display = "block";

  if (messagesListener) {
    messagesListener();
    messagesListener = null;
  }

  currentChatUserId = null;
  currentChatUsername = null;

  if (messagesContainer) {
    messagesContainer.innerHTML = "<p>No messages yet.</p>";
  }

  clearSelectedMessageImage();
  loadMessagesFriendsList();
}

function loadMessagesFriendsList() {
  const user = auth.currentUser;
  if (!user) return;

  if (messagesFriendsList) {
    messagesFriendsList.innerHTML = "<p>Loading friends...</p>";
  }

  db.collection("users")
    .doc(user.uid)
    .collection("friends")
    .get()
    .then(function (snapshot) {
      if (messagesFriendsList) {
        if (snapshot.empty) {
          messagesFriendsList.innerHTML = "<p>No friends to message.</p>";
          return;
        }

        messagesFriendsList.innerHTML = "";
        snapshot.forEach(function (doc) {
          const friend = doc.data();
          const friendId = doc.id;

          const friendCard = document.createElement("div");
          friendCard.className = "message-friend-card";

          const avatar = document.createElement("div");
          avatar.className = "user-avatar";
          avatar.textContent = (friend.username || "U").charAt(0).toUpperCase();

          const info = document.createElement("div");
          info.className = "user-info";

          const name = document.createElement("div");
          name.className = "user-name";
          name.textContent = friend.username || "Unknown";

          const status = createUserStatusIndicator(friend.status || "offline");

          info.appendChild(name);

          const messageBtn = document.createElement("button");
          messageBtn.className = "action-btn primary";
          messageBtn.textContent = "Message";
          messageBtn.addEventListener("click", function () {
            openMessageDialog({
              id: friendId,
              username: friend.username,
              email: friend.email,
              status: friend.status,
            });
          });

          friendCard.appendChild(avatar);
          friendCard.appendChild(info);
          friendCard.appendChild(status);
          friendCard.appendChild(messageBtn);

          messagesFriendsList.appendChild(friendCard);
        });
      }
    })
    .catch(function (error) {
      console.error("Error loading friends for messages:", error);
      if (messagesFriendsList)
        messagesFriendsList.innerHTML = "<p>Error loading friends.</p>";
    });
}

function closeMessageDialog() {
  messageOverlay.classList.remove("active");
  messageOverlay.setAttribute("aria-hidden", "true");

  if (messagesListener) {
    messagesListener();
    messagesListener = null;
  }

  currentChatUserId = null;
  currentChatUsername = null;

  if (messagesContainer) {
    messagesContainer.innerHTML = "<p>No messages yet.</p>";
  }

  clearSelectedMessageImage();
  showMainMessagesView();
}

function loadMessages() {
  const user = auth.currentUser;
  if (!user || !currentChatUserId) return;

  if (messagesListener) {
    messagesListener();
  }

  const conversationId = [user.uid, currentChatUserId].sort().join("_");
  let chatInitialLoad = true;

  messagesListener = db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .orderBy("timestamp", "asc")
    .onSnapshot(
      function (snapshot) {
        if (snapshot.empty) {
          if (messagesContainer)
            messagesContainer.innerHTML =
              "<p>No messages yet. Start the conversation!</p>";
          chatInitialLoad = false;
          return;
        }

        messagesContainer.innerHTML = "";
        snapshot.forEach(function (doc) {
          const message = doc.data();
          const messageBubble = createMessageBubble(message, user.uid);
          messagesContainer.appendChild(messageBubble);
        });

        if (!chatInitialLoad) {
          snapshot.docChanges().forEach(function (change) {
            if (change.type === "added") {
              const msg = change.doc.data();
              if (msg.senderId !== user.uid) {
                const preview = msg.text
                  ? msg.text.length > 50
                    ? msg.text.substring(0, 50) + "..."
                    : msg.text
                  : "[image]";
                addHistory(
                  "message",
                  "Message received from " + currentChatUsername,
                  preview,
                );
              }
            }
          });
        }
        chatInitialLoad = false;

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      },
      function (error) {
        console.error("Error loading messages:", error);
        if (messagesContainer)
          messagesContainer.innerHTML = "<p>Error loading messages.</p>";
      },
    );
}

function createMessageBubble(message, currentUserId) {
  const bubble = document.createElement("div");
  bubble.className =
    "message-bubble " +
    (message.senderId === currentUserId ? "sent" : "received");

  if (message.text) {
    const text = document.createElement("div");
    text.className = "message-text";
    text.textContent = message.text;
    bubble.appendChild(text);
  }

  if (message.imageUrl) {
    const image = document.createElement("img");
    image.className = "message-image";
    image.src = message.imageUrl;
    image.alt = message.imageName || "Attached image";
    image.addEventListener("click", function () {
      const win = window.open("", "_blank");
      win.document.write('<body style="margin:0;padding:0;background:#000;"><img src="' + message.imageUrl + '" style="width:100vw;height:100vh;object-fit:cover;display:block;"></body>');
      win.document.close();
    });
    bubble.appendChild(image);
  }

  const meta = document.createElement("div");
  meta.className = "message-meta";

  if (message.timestamp) {
    const date = message.timestamp.toDate();
    meta.textContent = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  bubble.appendChild(meta);

  return bubble;
}

function sendMessage() {
  const user = auth.currentUser;
  if (!user || !currentChatUserId || isSendingMessage) return;

  const text = messageInput ? messageInput.value.trim() : "";
  const imageFile = selectedMessageImageFile;
  if (!text && !imageFile) return;

  const conversationId = [user.uid, currentChatUserId].sort().join("_");
  const messageRef = db
    .collection("conversations")
    .doc(conversationId)
    .collection("messages")
    .doc();

  setMessageSendingState(true);

  const saveMessage = function (imageData) {
    const messageData = {
      senderId: user.uid,
      senderName: user.displayName || "Unknown",
      text: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (imageData) {
      messageData.imageUrl = imageData.imageUrl;
      messageData.imagePath = imageData.imagePath;
      messageData.imageName = imageData.imageName;
      messageData.imageType = imageData.imageType;
    }

    return messageRef.set(messageData);
  };

  const imageUpload = imageFile
    ? uploadMessageImage(conversationId, messageRef.id, imageFile)
    : Promise.resolve(null);

  const recipientName = currentChatUsername;
  imageUpload
    .then(saveMessage)
    .then(function () {
      const sentText = text
        ? text.length > 50
          ? text.substring(0, 50) + "..."
          : text
        : "[image]";
      addHistory("message", "Message sent to " + recipientName, sentText);
      if (messageInput) messageInput.value = "";
      clearSelectedMessageImage();
    })
    .catch(function (error) {
      console.error("Error sending message:", error);
      alert(
        "Failed to send message. If this included an image, check that Firebase Storage is enabled and allows signed-in uploads.",
      );
    })
    .finally(function () {
      setMessageSendingState(false);
    });
}

function setupProfileDialog() {
  if (profileClose) {
    profileClose.addEventListener("click", closeProfileDialog);
  }

  if (profileOverlay) {
    profileOverlay.addEventListener("click", function (event) {
      if (event.target === profileOverlay) {
        closeProfileDialog();
      }
    });
  }
}

function openProfileDialog(user, context) {
  currentProfileUserId = user.id;

  if (profileAvatar) {
    profileAvatar.textContent = user.username.charAt(0).toUpperCase();
  }

  if (profileUsername) {
    profileUsername.textContent = user.username;
  }

  if (profileEmail) {
    profileEmail.textContent = user.email;
  }

  const status = user.status || "offline";
  if (profileStatus) {
    profileStatus.className = "status-indicator " + status;
    profileStatus.innerHTML =
      '<span class="status-dot"></span>' +
      status.charAt(0).toUpperCase() +
      status.slice(1);
  }

  if (profileStatusText) {
    profileStatusText.textContent =
      status.charAt(0).toUpperCase() + status.slice(1);
  }

  if (profileJoined) {
    db.collection("users")
      .doc(user.id)
      .get()
      .then(function (doc) {
        if (doc.exists && doc.data().lastSeen) {
          const lastSeen = doc.data().lastSeen.toDate();
          profileJoined.textContent = lastSeen.toLocaleDateString();
        } else {
          profileJoined.textContent = "N/A";
        }
      })
      .catch(function (error) {
        console.error("Error fetching join date:", error);
        profileJoined.textContent = "N/A";
      });
  }

  if (profileActions) {
    profileActions.innerHTML = "";

    const currentUser = auth.currentUser;
    if (currentUser) {
      if (context === "friend") {
        const messageBtn = document.createElement("button");
        messageBtn.className = "action-btn primary";
        messageBtn.textContent = "Message";
        messageBtn.addEventListener("click", function () {
          closeProfileDialog();
          openMessageDialog(user);
        });
        profileActions.appendChild(messageBtn);

        const removeFriendBtn = document.createElement("button");
        removeFriendBtn.className = "action-btn danger";
        removeFriendBtn.textContent = "Remove Friend";
        removeFriendBtn.addEventListener("click", function () {
          removeFriend(currentUser, user.id);
          closeProfileDialog();
        });
        profileActions.appendChild(removeFriendBtn);
      } else {
        db.collection("users")
          .doc(currentUser.uid)
          .collection("friends")
          .doc(user.id)
          .get()
          .then(function (doc) {
            if (doc.exists) {
              const messageBtn = document.createElement("button");
              messageBtn.className = "action-btn primary";
              messageBtn.textContent = "Message";
              messageBtn.addEventListener("click", function () {
                closeProfileDialog();
                openMessageDialog(user);
              });
              profileActions.appendChild(messageBtn);

              const removeFriendBtn = document.createElement("button");
              removeFriendBtn.className = "action-btn danger";
              removeFriendBtn.textContent = "Remove Friend";
              removeFriendBtn.addEventListener("click", function () {
                removeFriend(currentUser, user.id);
                closeProfileDialog();
              });
              profileActions.appendChild(removeFriendBtn);
            } else {
              db.collection("friendRequests")
                .where("fromUserId", "==", currentUser.uid)
                .where("toUserId", "==", user.id)
                .where("status", "==", "pending")
                .get()
                .then(function (querySnapshot) {
                  if (querySnapshot.empty) {
                    const addFriendBtn = document.createElement("button");
                    addFriendBtn.className = "action-btn primary";
                    addFriendBtn.textContent = "Add Friend";
                    addFriendBtn.addEventListener("click", function () {
                      sendFriendRequest(currentUser, user);
                      closeProfileDialog();
                    });
                    profileActions.appendChild(addFriendBtn);
                  } else {
                    const pendingBtn = document.createElement("button");
                    pendingBtn.className = "action-btn secondary";
                    pendingBtn.textContent = "Request Pending";
                    pendingBtn.disabled = true;
                    profileActions.appendChild(pendingBtn);
                  }
                });
            }
          });
      }
    }
  }

  profileOverlay.classList.add("active");
  profileOverlay.setAttribute("aria-hidden", "false");
}

function closeProfileDialog() {
  profileOverlay.classList.remove("active");
  profileOverlay.setAttribute("aria-hidden", "true");
  currentProfileUserId = null;
}

// Game section
const gameListView = document.getElementById("game-list-view");
const gamePlayView = document.getElementById("game-play-view");
const gameIframe = document.getElementById("game-iframe");
const gamePlayTitle = document.getElementById("game-play-title");
const gameBackBtn = document.getElementById("game-back-btn");
const gameFullscreenBtn = document.getElementById("game-fullscreen-btn");

let gameSessionTitle = null;
let gameSessionStart = null;

function formatPlayDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return hours + "h " + minutes + "m";
  if (minutes > 0) return minutes + "m " + seconds + "s";
  return seconds + "s";
}

document
  .querySelectorAll("#game-list-view .game-card")
  .forEach(function (card) {
    card.addEventListener("click", function () {
      const url = card.dataset.url;
      const title = card.dataset.title;
      gameSessionTitle = title;
      gameSessionStart = Date.now();
      gamePlayTitle.textContent = title;
      gameIframe.src = url;
      gameListView.classList.add("hidden");
      gamePlayView.classList.remove("hidden");
      setTimeout(function () {
        gameIframe.focus();
      }, 200);
    });
  });

if (gameIframe) {
  gameIframe.addEventListener("click", function () {
    gameIframe.focus();
  });
}

if (gameBackBtn) {
  gameBackBtn.addEventListener("click", function () {
    if (gameSessionTitle && gameSessionStart) {
      const duration = formatPlayDuration(Date.now() - gameSessionStart);
      addHistory("game", "Played " + gameSessionTitle, duration);
    }
    gameSessionTitle = null;
    gameSessionStart = null;
    gameIframe.src = "";
    gamePlayView.classList.add("hidden");
    gameListView.classList.remove("hidden");
  });
}

if (gameFullscreenBtn) {
  gameFullscreenBtn.addEventListener("click", function () {
    if (gameIframe.requestFullscreen) {
      gameIframe.requestFullscreen();
    } else if (gameIframe.webkitRequestFullscreen) {
      gameIframe.webkitRequestFullscreen();
    }
  });
}

// Adventure game section
const advGameListView = document.getElementById("adv-game-list-view");
const advGamePlayView = document.getElementById("adv-game-play-view");
const advGameIframe = document.getElementById("adv-game-iframe");
const advGamePlayTitle = document.getElementById("adv-game-play-title");
const advGameBackBtn = document.getElementById("adv-game-back-btn");
const advGameFullscreen = document.getElementById("adv-game-fullscreen-btn");

let advSessionTitle = null;
let advSessionStart = null;

document
  .querySelectorAll("#adv-game-list-view .game-card")
  .forEach(function (card) {
    card.addEventListener("click", function () {
      advSessionTitle = card.dataset.title;
      advSessionStart = Date.now();
      advGamePlayTitle.textContent = card.dataset.title;
      advGameIframe.src = card.dataset.url;
      advGameListView.classList.add("hidden");
      advGamePlayView.classList.remove("hidden");
      setTimeout(function () {
        advGameIframe.focus();
      }, 200);
    });
  });

if (advGameIframe) {
  advGameIframe.addEventListener("click", function () {
    advGameIframe.focus();
  });
}

if (advGameBackBtn) {
  advGameBackBtn.addEventListener("click", function () {
    if (advSessionTitle && advSessionStart) {
      const duration = formatPlayDuration(Date.now() - advSessionStart);
      addHistory("game", "Played " + advSessionTitle, duration);
    }
    advSessionTitle = null;
    advSessionStart = null;
    advGameIframe.src = "";
    advGamePlayView.classList.add("hidden");
    advGameListView.classList.remove("hidden");
  });
}

if (advGameFullscreen) {
  advGameFullscreen.addEventListener("click", function () {
    if (advGameIframe.requestFullscreen) {
      advGameIframe.requestFullscreen();
    } else if (advGameIframe.webkitRequestFullscreen) {
      advGameIframe.webkitRequestFullscreen();
    }
  });
}

// Other tab
const otherListView = document.getElementById("other-list-view");
const otherPlayView = document.getElementById("other-play-view");
const otherIframe = document.getElementById("other-iframe");
const otherPlayTitle = document.getElementById("other-play-title");
const otherBackBtn = document.getElementById("other-back-btn");
const otherFullscreen = document.getElementById("other-fullscreen-btn");

document
  .querySelectorAll("#other-list-view .tool-card")
  .forEach(function (card) {
    card.addEventListener("click", function () {
      otherPlayTitle.textContent = card.dataset.title;
      otherIframe.src = card.dataset.url;
      otherListView.classList.add("hidden");
      otherPlayView.classList.remove("hidden");
      setTimeout(function () {
        otherIframe.focus();
      }, 200);
    });
  });

if (otherBackBtn) {
  otherBackBtn.addEventListener("click", function () {
    otherIframe.src = "";
    otherPlayView.classList.add("hidden");
    otherListView.classList.remove("hidden");
  });
}

if (otherFullscreen) {
  otherFullscreen.addEventListener("click", function () {
    if (otherIframe.requestFullscreen) {
      otherIframe.requestFullscreen();
    } else if (otherIframe.webkitRequestFullscreen) {
      otherIframe.webkitRequestFullscreen();
    }
  });
}
