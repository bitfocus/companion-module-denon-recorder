// Display formatting for time values reported by the recorder

/**
 * 'HHHMMSS' -> 'H:MM:SS'
 */
export function formatHMS(raw) {
	if (!/^\d{7}$/.test(raw)) {
		return raw
	}
	return `${parseInt(raw.slice(0, 3), 10)}:${raw.slice(3, 5)}:${raw.slice(5, 7)}`
}

/**
 * 'MMMSSFF' -> 'M:SS'
 */
export function formatMS(raw) {
	if (!/^\d{7}$/.test(raw)) {
		return raw
	}
	return `${parseInt(raw.slice(0, 3), 10)}:${raw.slice(3, 5)}`
}
