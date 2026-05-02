/**
 * Calculate the crop rectangle in source video pixel coordinates.
 *
 * This assumes the camera was requested at the same aspect ratio as the
 * viewport (portrait 9:16). The browser may deliver a slightly different
 * resolution, so we use the *actual* video dimensions at capture time.
 *
 * With object-cover the video is scaled uniformly to fill the container,
 * cropping the axis that overflows. We reverse that scale to map the
 * overlay rect (centered in the container) back to source pixel coords.
 *
 * Because we request a portrait resolution that matches the viewport aspect
 * ratio, the cover scale is very close to 1:1 on both axes, making the
 * mapping accurate without any padding hacks.
 */

export interface CropParams {
  /** Actual pixel dimensions reported by video.videoWidth / videoHeight */
  sourceWidth: number
  sourceHeight: number
  /** CSS dimensions of the container the video is rendered into */
  containerWidth: number
  containerHeight: number
  /** CSS dimensions of the overlay guide box */
  rectWidth: number
  rectHeight: number
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export function calculateCrop(params: CropParams): CropRect {
  const {
    sourceWidth, sourceHeight,
    containerWidth, containerHeight,
    rectWidth, rectHeight,
  } = params

  // object-cover: scale so the video fills the container on both axes,
  // cropping whichever axis overflows.
  const coverScale = Math.max(
    containerWidth / sourceWidth,
    containerHeight / sourceHeight,
  )

  // Overflow on each axis (how many rendered px extend beyond the container)
  const renderedW = sourceWidth * coverScale
  const renderedH = sourceHeight * coverScale
  const overflowX = (renderedW - containerWidth) / 2
  const overflowY = (renderedH - containerHeight) / 2

  // Overlay rect top-left in container-space (always centered)
  const rectLeft = (containerWidth - rectWidth) / 2
  const rectTop  = (containerHeight - rectHeight) / 2

  // Map to source-video-space: add the overflow offset then divide by scale
  const cropX = (rectLeft + overflowX) / coverScale
  const cropY = (rectTop  + overflowY) / coverScale
  const cropW = rectWidth  / coverScale
  const cropH = rectHeight / coverScale

  // Clamp to source bounds
  const x = Math.round(Math.max(0, cropX))
  const y = Math.round(Math.max(0, cropY))
  const w = Math.round(Math.min(cropW, sourceWidth  - x))
  const h = Math.round(Math.min(cropH, sourceHeight - y))

  return { x, y, width: w, height: h }
}
