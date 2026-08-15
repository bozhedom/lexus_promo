import { ImageResponse } from 'next/og'

import type { CarPhoto } from '@/shared/config/car-photos'
import {
  certificateCopy,
  certificateFace,
  certificateSerial,
  formatPlateLine,
  inviteLines,
  isOwnBrand,
  isToyota,
  plateParts,
  splitGuestName,
  type CertificateKind,
} from '@/widgets/certificate-sheet/layout'

import type { PersonalInviteDetails } from '../model/types'
import { loadCertificateAssets } from './certificate/assets'
import { CarFrame, FrameBorder, GuestPlate, Rule } from './certificate/frame'
import { Contacts, Disclaimer, GiftBadge, GiftPanel } from './certificate/gift'
import {
  BrandMark,
  CarLine,
  Crown,
  DealerName,
  Eyebrow,
  GuestName,
  InviteLines,
} from './certificate/heading'
import { CERT_HEIGHT, CERT_SCALE, CERT_WIDTH, u } from './certificate/theme'

export { CERT_HEIGHT, CERT_SCALE, CERT_WIDTH }
export type { CertificateKind }

export async function renderCertificate(
  kind: CertificateKind,
  details: PersonalInviteDetails,
  fileName: string,
  /** Кадры из админки: они перекрывают встроенные, см. `matchCarPhoto`. */
  photos: CarPhoto[] = [],
) {
  const face = certificateFace(
    kind,
    { brand: details.brand, model: details.model, year: details.year },
    photos,
  )
  const copy = certificateCopy(kind, details.amount)
  const toyota = isToyota(details.brand)
  // См. `CertificateSheet`: логотип марки ставится только маркам техцентра.
  const ownBrand = isOwnBrand(details.brand)
  const carLine = [details.brand, details.model].filter(Boolean).join(' ')
  const onCar = details.plate ? plateParts(details.plate) : null
  const tallPanel = kind === 'gift'

  const assets = await loadCertificateAssets(face.photoRaster)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#000',
          color: '#fff',
          fontFamily: 'RobotoCondensed',
        }}
      >
        <CarFrame photo={assets.photo} />
        {onCar && face.plate && <GuestPlate parts={onCar} box={face.plate} />}
        <FrameBorder />
        <Crown src={assets.crown} />
        <Eyebrow />

        <Rule top={u(63)} />
        <GuestName lines={splitGuestName(details.fullName)} />
        <Rule top={u(147)} />

        {carLine || details.plate ? (
          <CarLine
            carLine={carLine}
            plateLine={details.plate ? formatPlateLine(details.plate) : null}
          />
        ) : null}

        <InviteLines lines={inviteLines(details.brand)} />
        <BrandMark toyota={toyota} lexusLogo={ownBrand ? assets.lexusLogo : null} />
        <DealerName ownBrand={ownBrand} />

        <GiftPanel copy={copy} tall={tallPanel} />
        <GiftBadge src={assets.gift} tall={tallPanel} />

        <Contacts
          address={face.address}
          marker={assets.marker}
          phone={assets.phone}
          serial={certificateSerial(kind, details.serials?.[kind])}
        />
        <Disclaimer />
      </div>
    ),
    {
      width: CERT_WIDTH,
      height: CERT_HEIGHT,
      fonts: [
        { name: 'Forum', data: assets.forum, weight: 400, style: 'normal' },
        { name: 'RobotoCondensed', data: assets.condensed, weight: 400, style: 'normal' },
        { name: 'RobotoCondensed', data: assets.condensedBold, weight: 700, style: 'normal' },
      ],
      headers: {
        'cache-control': 'private, no-store, max-age=0',
        'content-disposition': `inline; filename="${fileName}"`,
      },
    },
  )
}
