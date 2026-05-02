const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function hapticTap() {
  if (canVibrate) navigator.vibrate!(10)
}

export function hapticSuccess() {
  if (canVibrate) navigator.vibrate!([50])
}

export function hapticError() {
  if (canVibrate) navigator.vibrate!([100, 50, 100])
}
