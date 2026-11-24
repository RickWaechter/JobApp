// inc/colors.js

export const lightColors = {
  mode: "light",

  // Basis & Hintergründe
  bg: "#082b5a",
  background: "#082b5a", // Alias für ProfilScreen (colors.background)
  surface: "#10102983",
  cardGroupBg: "rgba(16, 16, 41, 0.55)",
  cardGroupBorder: "#4a5e7da6",
  divider: "rgba(255, 255, 255, 0.10)",
  pressedBg: "rgba(255, 255, 255, 0.08)",

  // Texte
  titleMain: "#FFFFFF",
  textMain: "#FFFFFF",
  subTitleMain: "#c2b9b9",
  textMuted: "rgba(194, 185, 185, 0.72)",
  textDim: "rgba(194, 185, 185, 0.5)",
  textOnPrimary: "#FFFFFF",

  // Akzente & Buttons
  primary: "#3B82F6",
  accentText: "#60A5FA",
  buttonInactive: "#334155",
  buttonSearch: "#1E3A8A",

  // Cards & Panels (actionCard.js & ProfilScreen)
  actionCard: "#10102983",
  actionCardBorder: "#4a5e7da6",
  secondaryCardBg: "rgba(255, 255, 255, 0.06)",
  namePanel: "#10102985",
  profileHeaderBg: "#122347",
  profileHeaderBorder: "rgba(255, 255, 255, 0.12)",
  avatarBg: "#3B82F6",

  // Badges
  badge: "#801217",
  badgeDot: "#198b3f",
  badgeText: "#f1ecec",
  badgeBg: "rgba(27, 45, 73, 0.35)",
  badgeBorder: "rgba(59, 130, 246, 0.35)",

  // Coins & Shop-Banner (ProfilScreen)
  coinAccent: "#F59E0B",
  coinText: "#FBBF24",
  coinBadgeBg: "rgba(245, 158, 11, 0.14)",
  coinBadgeBorder: "rgba(245, 158, 11, 0.35)",
  shopBannerBg: "#101e3d",
  shopBannerBorder: "rgba(245, 158, 11, 0.28)",
  shopBannerGlow: "rgba(245, 158, 11, 0.10)",
  shopIconBg: "rgba(245, 158, 11, 0.16)",
// In darkColors ergänzen / ersetzen (statt der zu schwachen 0.09-Alpha-Werte):
  border: "#2C2C2E",
  actionCardBorder: "#2C2C2E",
  cardGroupBorder: "#2C2C2E",
  profileHeaderBorder: "#2C2C2E",
  inputBorder: "#3A3A3C",
  divider: "#27272A",
  // Icons & Container
  iconContainer: "#404a8350",
  iconBg: "rgba(59, 130, 246, 0.16)",
  iconLeading: "#f1ecec",
  iconPin: "#f1ecec",
  iconArrow: "#c2b9b9",
  iconEmpty: "#b39e2cd2",
  iconClear: "#F87171",
  resultIconBg: "rgba(255, 255, 255, 0.08)",

  // Fehlerzustände
  errorBg: "rgba(248, 113, 113, 0.12)",
  errorBorder: "rgba(248, 113, 113, 0.65)",

  // Schatten
  shadow: "#000000",
  shadowOpacity: 0.18,
  elevation: 3,
  primaryShadowOpacity: 0.2,
  primaryElevation: 4,
  inputBg: "rgba(255, 255, 255, 0.08)",
  inputBorder: "rgba(148, 163, 184, 0.28)",
  tabBarBg: "#0d1b3a",
  tabActiveBg: "rgba(59, 130, 246, 0.25)",
  menuBlurBg: "rgba(12, 24, 52, 0.75)",
  accordionBg: "rgba(10, 20, 44, 0.88)",
  overlayBackdrop: "rgba(4, 14, 34, 0.88)",
  previewBarBg: "#101e3d",
  previewToggleBg: "rgba(0, 0, 0, 0.30)",
  previewCloseBg: "rgba(255, 255, 255, 0.10)",
};

export const darkColors = {
  mode: "dark",
// Basis & Hintergründe (wie profilModals / ExperienceModal)
  bg: "#0F1117",
  background: "#0F1117",
  surface: "#16181E",                       // MENU_SURFACE
  modalSurface: "#16181E",
  cardGroupBg: "rgba(255, 255, 255, 0.03)", // wie experienceCard
  cardGroupBorder: "rgba(255, 255, 255, 0.08)",
  border: "rgba(255, 255, 255, 0.09)",
  divider: "rgba(255, 255, 255, 0.08)",
  pressedBg: "rgba(255, 255, 255, 0.05)",

  // Texte
  titleMain: "#FFFFFF",
  textMain: "#FFFFFF",
  subTitleMain: "rgba(255, 255, 255, 0.55)",
  textMuted: "rgba(255, 255, 255, 0.45)",
  textDim: "rgba(255, 255, 255, 0.30)",     // Placeholder-Ton aus experienceCard
  textOnPrimary: "#FFFFFF",

  // Akzente & Buttons
  primary: "#3B82F6",
  accentText: "#60A5FA",
  accentBg: "rgba(59, 130, 246, 0.12)",
  accentBorder: "rgba(59, 130, 246, 0.30)",
  buttonInactive: "#1E222D",
  buttonSearch: "#3B82F6",

  // Cards & Panels (experienceCard-Look)
  actionCard: "#16181E",
  actionCardBorder: "rgba(255, 255, 255, 0.09)",
  secondaryCardBg: "rgba(255, 255, 255, 0.03)",
  namePanel: "#16181E",
  profileHeaderBg: "#16181E",
  profileHeaderBorder: "rgba(255, 255, 255, 0.08)",
  avatarBg: "#3B82F6",

  // Formulare, Tabs & Overlays (CoverScreen / CoverParts / Modals)
  inputBg: "#12151D",                       // exakter textInput-Ton aus experienceCard
  inputBorder: "rgba(255, 255, 255, 0.10)",
  tabBarBg: "#16181E",
  tabActiveBg: "rgba(59, 130, 246, 0.15)",
  menuBlurBg: "rgba(22, 24, 30, 0.80)",
  accordionBg: "rgba(18, 21, 29, 0.92)",
  overlayBackdrop: "rgba(9, 11, 16, 0.85)",
  previewBarBg: "#16181E",
  previewToggleBg: "#12151D",
  previewCloseBg: "rgba(255, 255, 255, 0.08)",

  // Badges (wie expBadge & badgeAi)
  badge: "#3B82F6",
  badgeDot: "#10B981",
  badgeText: "rgba(255, 255, 255, 0.85)",
  badgeBg: "rgba(255, 255, 255, 0.07)",
  badgeBorder: "rgba(255, 255, 255, 0.12)",

  // Coins & Shop-Banner
  coinAccent: "#F59E0B",
  coinText: "#FBBF24",
  coinBadgeBg: "rgba(245, 158, 11, 0.15)",
  coinBadgeBorder: "rgba(245, 158, 11, 0.30)",
  shopBannerBg: "#16181E",
  shopBannerBorder: "rgba(245, 158, 11, 0.25)",
  shopBannerGlow: "rgba(245, 158, 11, 0.08)",
  shopIconBg: "rgba(245, 158, 11, 0.15)",

  // Icons & Container
  iconContainer: "rgba(255, 255, 255, 0.07)",
  iconBg: "rgba(59, 130, 246, 0.15)",
  iconLeading: "#E5E7EB",
  iconPin: "#E5E7EB",
  iconArrow: "rgba(255, 255, 255, 0.40)",
  iconEmpty: "#F59E0B",
  iconClear: "#EF4444",
  resultIconBg: "rgba(255, 255, 255, 0.06)",

  // Erfolg & Fehler
  success: "#10B981",
  successBg: "rgba(16, 185, 129, 0.15)",
  successBorder: "rgba(16, 185, 129, 0.35)",
  errorBg: "rgba(239, 68, 68, 0.12)",
  errorBorder: "rgba(239, 68, 68, 0.40)",

  // Schatten
  shadow: "#000000",
  shadowOpacity: 0.45,
  elevation: 4,
  primaryShadowOpacity: 0.30,
  primaryElevation: 5,
};