import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {
      colors: {
        // TUS COLORES CORPORATIVOS ESTRICTOS
        primary: {
          DEFAULT: '#E31E24', // Acento Rojo
          foreground: '#FFFFFF', // Texto de botones
        },
        background: '#F8F9FB', // Fondo General
        foreground: '#111111', // Texto Oscuro
        card: '#FFFFFF',       // Tarjetas Blancas
        
        status: {
          success: '#10B981', 
          warning: '#F59E0B', 
          danger: '#E31E24', // Usamos tu rojo corporativo aquí también
        },
        
        // REQUISITOS DE SHADCN
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;