export interface CategoryVisual {
  gradient: string;
  emoji: string;
}

export const CATEGORIES = [
  'Deporte y aire libre',
  'Ocio y social',
  'Conocer gente',
  'Gastronomía',
  'Cultura',
  'Aficiones',
  'Viajes y escapadas',
  'Formación',
  'Familia',
  'Voluntariado',
  'Otros',
];

export const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  'Deporte y aire libre': { gradient: 'linear-gradient(135deg, #10b981, #059669)', emoji: '🏃' },
  'Ocio y social':        { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', emoji: '🎉' },
  'Conocer gente':        { gradient: 'linear-gradient(135deg, #ec4899, #be185d)', emoji: '👋' },
  'Gastronomía':          { gradient: 'linear-gradient(135deg, #f97316, #ea580c)', emoji: '🍽️' },
  'Cultura':              { gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', emoji: '🎭' },
  'Aficiones':            { gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', emoji: '🎨' },
  'Viajes y escapadas':   { gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', emoji: '✈️' },
  'Formación':            { gradient: 'linear-gradient(135deg, #eab308, #ca8a04)', emoji: '📚' },
  'Familia':              { gradient: 'linear-gradient(135deg, #f472b6, #ec4899)', emoji: '👨‍👩‍👧' },
  'Voluntariado':         { gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', emoji: '❤️' },
  'Otros':                { gradient: 'linear-gradient(135deg, #94a3b8, #64748b)', emoji: '✨' },
};

const DEFAULT_VISUAL: CategoryVisual = {
  gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  emoji: '📌',
};

export function getCategoryVisual(category?: string): CategoryVisual {
  return (category && CATEGORY_VISUALS[category]) || DEFAULT_VISUAL;
}
