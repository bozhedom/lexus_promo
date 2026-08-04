// Справочные значения для ручного ввода данных об авто (экран 3, 3b/3c).
// Списки моделей: самые ходовые на вторичном рынке РФ; если марки/модели нет,
// пользователь выбирает «Другая» и вводит модель вручную.

export const OTHER_OPTION = 'Другая'

const MODELS: Record<string, string[]> = {
  Toyota: [
    'Camry', 'Corolla', 'RAV4', 'Land Cruiser', 'Land Cruiser Prado', 'Highlander',
    'Fortuner', 'C-HR', 'Avensis', 'Vitz', 'Alphard', 'Hilux',
  ],
  Lexus: ['RX', 'NX', 'LX', 'GX', 'ES', 'IS', 'LS', 'UX', 'GS', 'RC'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8'],
  BMW: ['1 серия', '3 серия', '5 серия', '7 серия', 'X1', 'X3', 'X5', 'X6', 'X7'],
  Chery: ['Tiggo 4', 'Tiggo 7 Pro', 'Tiggo 8 Pro', 'Arrizo 8', 'Tiggo 3'],
  Chevrolet: ['Aveo', 'Cruze', 'Captiva', 'Lacetti', 'Niva', 'Tahoe'],
  Ford: ['Focus', 'Mondeo', 'Kuga', 'Explorer', 'Transit', 'EcoSport'],
  Geely: ['Coolray', 'Atlas', 'Tugella', 'Monjaro', 'Emgrand'],
  Haval: ['Jolion', 'F7', 'F7x', 'Dargo', 'H9'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Fit', 'Pilot', 'HR-V'],
  Hyundai: ['Solaris', 'Creta', 'Tucson', 'Santa Fe', 'Elantra', 'Sonata', 'Palisade'],
  Kia: ['Rio', 'Sportage', 'Sorento', 'Ceed', 'Optima', 'K5', 'Seltos', 'Soul'],
  'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Discovery', 'Defender'],
  Mazda: ['3', '6', 'CX-5', 'CX-9', 'CX-30', 'Demio'],
  'Mercedes-Benz': ['A-класс', 'C-класс', 'E-класс', 'S-класс', 'GLA', 'GLC', 'GLE', 'GLS', 'V-класс'],
  Mitsubishi: ['Outlander', 'Pajero', 'Pajero Sport', 'Lancer', 'ASX', 'L200'],
  Nissan: ['Qashqai', 'X-Trail', 'Juke', 'Almera', 'Teana', 'Patrol', 'Note'],
  Renault: ['Logan', 'Duster', 'Sandero', 'Kaptur', 'Arkana', 'Megane'],
  Skoda: ['Octavia', 'Rapid', 'Kodiaq', 'Karoq', 'Superb', 'Fabia'],
  Subaru: ['Forester', 'Outback', 'XV', 'Impreza', 'Legacy'],
  Suzuki: ['Vitara', 'Grand Vitara', 'SX4', 'Jimny', 'Swift'],
  Volkswagen: ['Polo', 'Tiguan', 'Passat', 'Touareg', 'Golf', 'Jetta', 'Teramont'],
  Volvo: ['XC40', 'XC60', 'XC90', 'S60', 'S90'],
  'ВАЗ (LADA)': ['Granta', 'Vesta', 'Largus', 'Niva Legend', 'Niva Travel', 'XRAY', 'Priora'],
  ГАЗ: ['ГАЗель Next', 'ГАЗель Бизнес', 'Соболь', 'ГАЗон Next'],
  УАЗ: ['Патриот', 'Хантер', 'Профи', 'Буханка'],
}

export const CAR_BRANDS: string[] = [...Object.keys(MODELS), OTHER_OPTION]

/** Модели выбранной марки. Для неизвестной марки: пустой список (ввод вручную). */
export function carModels(brand: string): string[] {
  const list = MODELS[brand]
  return list ? [...list, OTHER_OPTION] : []
}

// Годы выпуска от текущего вниз до 1990
export function carYears(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current; y >= 1990; y--) years.push(y)
  return years
}
