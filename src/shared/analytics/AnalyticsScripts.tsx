import Script from 'next/script'

import { MetrikaPageviews } from './MetrikaPageviews'

// Подключает Яндекс.Метрику и GA4, если заданы соответствующие env.
// Свои события дублируются в них как цели в трекере (tracker.ts).
export function AnalyticsScripts() {
  const ymId = process.env.NEXT_PUBLIC_YM_ID
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <>
      {ymId && (
        <>
          {/* webvisor пишет сессии, clickmap — карту кликов: по ним видно,
              где именно человек застревает, а не только сколько дошло */}
          <Script id="ym-init" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${ymId}','ym');ym(${ymId},'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});`}
          </Script>
          <MetrikaPageviews counterId={Number(ymId)} />
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${ymId}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        </>
      )}

      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
    </>
  )
}
