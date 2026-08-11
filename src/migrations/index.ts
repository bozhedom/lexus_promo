import * as migration_20260720_062951_initial from './20260720_062951_initial';
import * as migration_20260729_052538_certificate_image from './20260729_052538_certificate_image';
import * as migration_20260729_055715_media_thumbnail from './20260729_055715_media_thumbnail';
import * as migration_20260806_024013_promo_slides_and_certificate_rules from './20260806_024013_promo_slides_and_certificate_rules';
import * as migration_20260810_120000_car_catalog from './20260810_120000_car_catalog';
import * as migration_20260811_140000_certificate_kind from './20260811_140000_certificate_kind';

export const migrations = [
  {
    up: migration_20260720_062951_initial.up,
    down: migration_20260720_062951_initial.down,
    name: '20260720_062951_initial',
  },
  {
    up: migration_20260729_052538_certificate_image.up,
    down: migration_20260729_052538_certificate_image.down,
    name: '20260729_052538_certificate_image',
  },
  {
    up: migration_20260729_055715_media_thumbnail.up,
    down: migration_20260729_055715_media_thumbnail.down,
    name: '20260729_055715_media_thumbnail',
  },
  {
    up: migration_20260806_024013_promo_slides_and_certificate_rules.up,
    down: migration_20260806_024013_promo_slides_and_certificate_rules.down,
    name: '20260806_024013_promo_slides_and_certificate_rules'
  },
  {
    up: migration_20260810_120000_car_catalog.up,
    down: migration_20260810_120000_car_catalog.down,
    name: '20260810_120000_car_catalog',
  },
  {
    up: migration_20260811_140000_certificate_kind.up,
    down: migration_20260811_140000_certificate_kind.down,
    name: '20260811_140000_certificate_kind',
  },
];
