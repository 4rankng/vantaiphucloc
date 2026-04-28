/**
 * Calculate the crop rectangle in source video pixel coordinates,
 * reversing the CSS `object-cover` transform so the captured image
 * matches exactly what the user sees through an overlay rectangle.
 *
 * object-cover scales the video by max(containerW/videoW, containerH/videoH),
 * center-cropping any overflow. We reverse this to map from container-space
 * overlay position to source video coordinates.
 */

export interface CropParams {
  sourceWidth: number
  sourceHeight: number
  containerWidth: number
  containerHeight: number
  rectWidth: number
  rectHeight: number
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export function calculateObjectCoverCrop(params: CropParams): CropRect {
  const {
    sourceWidth, sourceHeight,
    containerWidth, containerHeight,
    rectWidth, rectHeight,
  } = params

  const coverScale = Math.max(containerWidth / sourceWidth, containerHeight / sourceHeight)
  const renderedW = sourceWidth * coverScale
  const renderedH = sourceHeight * coverScale
  const offsetX = (renderedW - containerWidth) / 2
  const offsetY = (renderedH - containerHeight) / 2

  const rectX = (containerWidth - rectWidth) / 2
  const rectY = (containerHeight - rectHeight) / 2

  let cropX = Math.round((rectX + offsetX) / coverScale)
  let cropY = Math.round((rectY + offsetY) / coverScale)
  let cropW = Math.round(rectWidth / coverScale)
  let cropH = Math.round(rectHeight / coverScale)

  cropX = Math.max(0, cropX)
  cropY = Math.max(0, cropY)
  cropW = Math.min(cropW, sourceWidth - cropX)
  cropH = Math.min(cropH, sourceHeight - cropY)

  return { x: cropX, y: cropY, width: cropW, height: cropH }
}
