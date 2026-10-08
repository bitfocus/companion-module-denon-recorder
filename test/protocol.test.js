import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACK, createLineParser, parseStatus } from '../protocol.js'
import { formatHMS, formatMS } from '../format.js'

function collect() {
	const lines = []
	const parse = createLineParser((line, acked) => lines.push([line, acked]))
	return { lines, parse }
}

test('splits multiple replies in one chunk', () => {
	const { lines, parse } = collect()
	parse(Buffer.from('@0STPL\r@0MMS1\r'))
	assert.deepEqual(lines, [
		['STPL', false],
		['MMS1', false],
	])
})

test('joins a reply split across chunks', () => {
	const { lines, parse } = collect()
	parse(Buffer.from('@0Tr00'))
	parse(Buffer.from('12\r'))
	assert.deepEqual(lines, [['Tr0012', false]])
})

test('marks replies that follow an ACK', () => {
	const { lines, parse } = collect()
	parse(Buffer.from([ACK, ...Buffer.from('@0PW00\r')]))
	parse(Buffer.from('@0STST\r'))
	parse(Buffer.from([ACK]))
	assert.deepEqual(lines, [
		['PW00', true],
		['STST', false],
	])
})

test('decodes enumerated values', () => {
	assert.equal(parseStatus('MMS1').value, 'SD Card 1')
	assert.equal(parseStatus('STRE').varId, 'status')
	assert.equal(parseStatus('STRE').value, 'Recording')
})

test('decodes free-form values', () => {
	const r = parseStatus('Tr0012')
	assert.equal(r.varId, 'track_cur')
	assert.equal(r.value, '0012')
})

test('decodes sub values', () => {
	assert.equal(parseStatus('AFPM24').value, 'PCM 24 bit')
	assert.equal(parseStatus('AFM3128').value, 'MP3 128K bps')
})

test('decodes left/right values', () => {
	const r = parseStatus('PhL00')
	assert.equal(r.key, 'PhL')
	assert.equal(r.varId, 'xlr_pp_l')
	assert.equal(r.value, 'On')
})

test('formats time values', () => {
	assert.equal(parseStatus('ET0010203').formatted, '1:02:03')
	assert.equal(formatHMS('0000509'), '0:05:09')
	assert.equal(formatMS('0031204'), '3:12')
	assert.equal(formatHMS('bad'), 'bad')
})

test('ignores unknown replies', () => {
	assert.equal(parseStatus('ZZ01'), undefined)
})
