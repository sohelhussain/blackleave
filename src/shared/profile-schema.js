export const PROFILE_SECTIONS = [
  "personal", "education", "experience", "projects", "skills", "links", "preferences", "resumes"
];

export const emptyProfile = () => ({
  personal: { firstName: "", lastName: "", email: "", phone: "", location: "", summary: "" },
  education: [], experience: [], projects: [], skills: [],
  links: { linkedin: "", github: "", portfolio: "" },
  preferences: { desiredRoles: [], locations: [], remote: false },
  resumes: []
});

export const getProfile = async () => {
  const { profile } = await chrome.storage.local.get("profile");
  return { ...emptyProfile(), ...profile };
};

export const saveProfile = (profile) => chrome.storage.local.set({ profile });
