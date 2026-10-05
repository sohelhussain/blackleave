import { PROFILE_SECTIONS, getProfile, saveProfile } from "../shared/profile-schema.js";

const form = document.querySelector("#profile-form"); const nav = document.querySelector("#sections");
const labels = { personal: "Personal Information", education: "Education", experience: "Experience", projects: "Projects", skills: "Skills", links: "Links", preferences: "Job Preferences", resumes: "Resumes" };
const fields = { personal: ["firstName", "lastName", "email", "phone", "location", "summary"], links: ["linkedin", "github", "portfolio"] };
const profile = await getProfile();
PROFILE_SECTIONS.forEach((section) => { const button = document.createElement("button"); button.textContent = labels[section]; button.type = "button"; button.onclick = () => render(section); nav.append(button); });
function render(section) { form.innerHTML = `<h2>${labels[section]}</h2>`; if (!fields[section]) { form.innerHTML += `<p class="coming">Structured ${labels[section].toLowerCase()} entries belong here.</p>`; return; } fields[section].forEach((key) => { const input = document.createElement(key === "summary" ? "textarea" : "input"); input.name = `${section}.${key}`; input.value = profile[section][key] || ""; input.placeholder = key.replace(/([A-Z])/g, " $1"); form.append(input); }); }
render("personal");
document.querySelector("#save").onclick = async () => { form.querySelectorAll("[name]").forEach((input) => { const [section, key] = input.name.split("."); profile[section][key] = input.value; }); await saveProfile(profile); document.querySelector("#status").textContent = "Saved."; };
document.querySelector("#review").onclick = () => chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => chrome.tabs.sendMessage(tab.id, { type: "OPEN_REVIEW" }));
