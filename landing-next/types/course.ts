// Course data schema for the creation flow

export interface Logo {
  id: string;
  name: string;
  url: string;
  tags?: string[];
}

export interface Schedule {
  dates: string;
  days: string;
  time: string;
}

export interface CourseDetails {
  title: string;
  description: string;
  duration: string;
  target_audience: string;
  schedule: Schedule;
  location: string;
}

export interface DesignPreferences {
  size: string;
  aesthetic_style: string;
  color_palette: string;
  lighting_and_atmosphere: string;
  typography_style: string;
  composition: string;
  visual_inspiration: string;
}

export interface ThemeColors {
  primary?: string;
  accent?: string;
  background?: string;
  text?: string;
  palette?: string[];
}

export interface Branding {
  logo: Logo | null; // Deprecated - use logos instead
  logos: Logo[]; // Up to 3 logos for banner integration
  theme: {
    theme_id: string;
    font_stack_id: string;
    palette_id: string;
    mode: "light" | "dark";
    colors?: ThemeColors;
    overrides: {
      primary: string | null;
      accent: string | null;
    };
  };
}

export interface GeneratedAssets {
  banner_url?: string;
  background_url?: string;
}

export interface LandingConfig {
  extended_description: string;
  requires_interview: boolean;
  referral_options: string[];
}

export interface CourseData {
  course_details: CourseDetails;
  design_preferences: DesignPreferences;
  branding: Branding;
  generated_assets: GeneratedAssets;
  landing_config?: LandingConfig;
}

// Default values for creating a new course
export const defaultCourseData: CourseData = {
  course_details: {
    title: "",
    description: "",
    duration: "",
    target_audience: "",
    schedule: {
      dates: "",
      days: "",
      time: "",
    },
    location: "",
  },
  design_preferences: {
    size: "instagram_story",
    aesthetic_style: "modern_tech",
    color_palette: "light_airy",
    lighting_and_atmosphere: "natural_light",
    typography_style: "modern_sans",
    composition: "balanced",
    visual_inspiration: "",
  },
  branding: {
    logo: null, // Deprecated
    logos: [],
    theme: {
      theme_id: "courseflow_light_mint",
      font_stack_id: "inter_noto",
      palette_id: "mint",
      mode: "light",
      overrides: {
        primary: null,
        accent: null,
      },
    },
  },
  generated_assets: {},
};
