/**
 * Calculate the crop rectangle in source video pixel coordinates.
 *
 * The overlay box position is passed as measured screen coordinates
 * (from getBoundingClientRect), so there is no assumption about centering.
 * This is the ground truth — whatever the user sees in the guide box is
 * exactly what gets cropped.
 *
 * The video is rendered with object-cover into a container that fills the
 * viewport. We reverse the cover scale to map from screen-space (CSS px)
 * to source video pixel coordinates.
 */

export interface CropParams {
  /** Actual pixel dimensions reported by video.videoWidth / videoHeight */
  sourceWidth: number
  sourceHeight: number
  /** Viewport dimensions (window.innerWidth / innerHeight) */
  containerWidth: number
  containerHeight: number
  /** Measured screen position of the guide box (from getBoundingClientRect) */
  rectLeft: number
  rectTop: number
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
    rectLeft, rectTop,
    rectWidth, rectHeight,
  } = params

  // object-cover scale: the video is scaled so it fills the container on
  // both axes, with the longer axis cropped symmetrically.
  const coverScale = Math.max(
    containerWidth / sourceWidth,
    containerHeight / sourceHeight,
  )

  // How many rendered pixels overflow the container on each axis (half each side)
  const renderedW = sourceWidth * coverScale
  const renderedH = sourceHeight * coverScale
  const overflowX = (renderedW - containerWidth) / 2
  const overflowY = (renderedH - containerHeight) / 2

  // Map screen-space rect position → source video pixel coordinates.
  // rectLeft/rectTop are already in viewport-space (CSS px from top-left).
  // Adding the overflow shifts into rendered-video-space, then dividing by
  // coverScale converts to source pixel space.
  const cropX = (rectLeft  + overflowX) / coverScale
  const cropY = (rectTop   + overflowY) / coverScale
  const cropW = rectWidth  / coverScale
  const cropH = rectHeight / coverScale

  // Clamp to source bounds
  const x = Math.round(Math.max(0, cropX))
  const y = Math.round(Math.max(0, cropY))
  const w = Math.round(Math.min(cropW, sourceWidth  - x))
  const h = Math.round(Math.min(cropH, sourceHeight - y))

  return { x, y, width: w, height: h }
}
