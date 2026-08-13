/**
 * Логотипы марок для экрана найденного автомобиля. Лежат в
 * `public/images/brands` и приведены к тёмному фону: слишком тёмные марки
 * оставлены силуэтом, белые подложки убраны.
 *
 * Марки, которой нет в списке, логотип просто не показывается — строка с
 * названием от этого не меняется.
 */
const LOGOS: Record<string, string> = {
  audi: 'audi',
  bmw: 'bmw',
  byd: 'byd',
  cadillac: 'cadillac',
  changan: 'changan',
  chery: 'chery',
  chevrolet: 'chevrolet',
  citroen: 'citroen',
  datsun: 'datsun',
  dodge: 'dodge',
  exeed: 'exeed',
  ford: 'ford',
  geely: 'geely',
  genesis: 'genesis',
  greatwall: 'great-wall',
  haval: 'haval',
  honda: 'honda',
  hyundai: 'hyundai',
  infiniti: 'infiniti',
  jaguar: 'jaguar',
  jeep: 'jeep',
  jetour: 'jetour',
  kia: 'kia',
  landrover: 'land-rover',
  lexus: 'lexus',
  liauto: 'li-auto',
  mazda: 'mazda',
  mercedesbenz: 'mercedes-benz',
  mercedes: 'mercedes-benz',
  mini: 'mini',
  mitsubishi: 'mitsubishi',
  nissan: 'nissan',
  omoda: 'omoda',
  opel: 'opel',
  peugeot: 'peugeot',
  porsche: 'porsche',
  renault: 'renault',
  skoda: 'skoda',
  subaru: 'subaru',
  suzuki: 'suzuki',
  tesla: 'tesla',
  toyota: 'toyota',
  volkswagen: 'volkswagen',
  volvo: 'volvo',
  zeekr: 'zeekr',
  lada: 'lada',
  ваз: 'lada',
  газ: 'gaz',
  уаз: 'uaz',
  тойота: 'toyota',
  лексус: 'lexus',
}

const normalize = (brand: string): string =>
  brand
    .toLocaleLowerCase('ru-RU')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-zа-яё]/g, '')

export function brandLogo(brand: string): string | null {
  const slug = LOGOS[normalize(brand)]
  return slug ? `/images/brands/${slug}.png` : null
}
