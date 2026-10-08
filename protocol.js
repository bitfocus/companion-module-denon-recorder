// Protocol helpers that don't depend on Companion, so they can be tested on their own

import { STATUS } from './responses.js'

export const ACK = 0x06
export const NAK = 0x15
const CR = 0x0d
const LF = 0x0a

/**
 * Splits the raw TCP byte stream into individual replies.
 * Replies are '@0<data>\r' and may be preceded by an ACK or NAK byte
 * when they answer a command we sent. A reply that was not preceded by ACK/NAK
 * is an unsolicited status update which the recorder expects us to ACK.
 *
 * @param {(line: string, acked: boolean) => void} onLine
 */
export function createLineParser(onLine) {
	let bytes = []
	let acked = false

	return (chunk) => {
		// an ACK/NAK only applies to data in the same chunk
		acked = false
		for (const byte of chunk) {
			if (byte === ACK || byte === NAK) {
				acked = true
			} else if (byte === CR) {
				let line = Buffer.from(bytes).toString('utf8')
				bytes = []
				if (line.startsWith('@0')) {
					line = line.slice(2)
				}
				if (line !== '') {
					onLine(line, acked)
				}
				acked = false
			} else if (byte !== LF) {
				bytes.push(byte)
			}
		}
	}
}

/**
 * Decode one reply (without the '@0' prefix) using the STATUS table
 *
 * @param {string} resp
 * @returns {{ key: string, cmd: string, varId: string, raw: string, value: string, formatted?: string } | undefined}
 */
export function parseStatus(resp) {
	const cmd = resp.slice(0, 2)
	const def = STATUS[cmd]
	if (!def) {
		return undefined
	}

	let key = cmd
	let varId = def.varName
	let body = resp.slice(2)

	if (def.hasLR) {
		const side = body.charAt(0)
		key = cmd + side
		varId += '_' + side.toLowerCase()
		body = body.slice(1)
	}

	const subLen = def.subLen || 0
	const val = subLen ? body.slice(0, subLen) : body
	const subVal = subLen ? body.slice(subLen) : ''
	const opt = def.opt[val]

	let value = opt?.desc ?? val
	if (subVal !== '') {
		value += ' ' + (opt?.sub?.[subVal] ?? subVal)
	}

	const result = { key, cmd, varId, raw: body, value }
	if (def.format) {
		result.formatted = def.format(body)
	}
	return result
}
