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
        // TUS COLORES CORPORATIVOS
        primary: {
          DEFAULT: '#1E3A8A', // Azul Marino Corporativo
          light: '#3B82F6',
          foreground: '#FFFFFF', // ¡Clave para que el texto de los botones sea blanco!
        },
        status: {
          success: '#10B981', // Verde - Visitada / Éxito
          warning: '#F59E0B', // Amarillo - Seguimiento / Pendiente
          danger: '#EF4444',  // Rojo - Sin visitar / Error
        },
        background: '#FFFFFF', // Fondo Blanco puro
        foreground: '#111827', // Texto gris muy oscuro (casi negro)
        
        // REQUISITOS DE SHADCN (Para que las tarjetas y bordes no desaparezcan)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
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