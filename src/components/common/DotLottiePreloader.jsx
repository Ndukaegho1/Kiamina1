import React from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

const DOT_LOTTIE_PRELOADER_SRC = 'https://lottie.host/da393c67-a6e9-49d3-a27b-06d1462bdbc9/WPzH61ogLV.lottie'

function DotLottiePreloader({
  size = 28,
  label = '',
  className = '',
  labelClassName = 'text-sm text-text-secondary',
}) {
  const resolvedSize = Number.isFinite(size) ? Math.max(12, size) : 28
  const renderedSize = Math.round(resolvedSize * 2)

  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <DotLottieReact
        src={DOT_LOTTIE_PRELOADER_SRC}
        loop
        autoplay
        style={{ width: `${renderedSize}px`, height: `${renderedSize}px` }}
      />
      {label && <span className={labelClassName}>{label}</span>}
    </div>
  )
}

export default DotLottiePreloader
