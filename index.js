import { combineRgb, Regex, TCPHelper, runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { compileVariableDefinitions } from './variables.js'
import { compileFeedbackDefinitions } from './feedback.js'
import { ACK, createLineParser, parseStatus } from './protocol.js'
import { UpgradeScripts } from './upgrades.js'

import * as CHOICES from './choices.js'

// how often the send queue is serviced
const PULSE_MS = 25
// keep-alive, device gets bored after 5 minutes
const KEEPALIVE_MS = 5000
// transport state is always re-read periodically (unless polling is disabled)
const TRANSPORT_STATUS = ['ST']
// optional: track and time values, only re-read when enabled in the config
const TRACK_STATUS = ['Tr', 'Tt', 'ET', 'RM', 'tl', 'RT', 'MM']
// never poll faster than this, to avoid flooding the recorder
const MIN_POLL_MS = 500
const DEFAULT_POLL_MS = 2000

const TRANSPORT_LABELS = Object.fromEntries(CHOICES.TRANSPORT.map((t) => [t.id, t.label]))

class DNRInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		this.devMode = process.env.DEVELOPER

		this.powerOn = false
		this.transState = 'STOF'
		this.POLL_COUNT = 1
		this.POLL_TIMEOUT = 1000

		this.needStats = true
		this.vStat = {}
		this.rawStat = {}
		this.queryQueue = []
	}

	/**
	 * @param {string} cmd - command without the '@0' prefix
	 * @param {string[]} refresh - status values to re-read after the command
	 */
	async sendCommand(cmd, refresh = []) {
		if (this.devMode) {
			this.log('debug', `sending '@0${cmd}' to ${this.config.host}`)
		}

		if (this.socket !== undefined && this.socket.isConnected) {
			this.socket.send('@0' + cmd + '\r')
			for (const id of refresh) {
				this.queueQuery(id)
			}
		} else {
			this.log('error', 'Not connected :(')
		}
	}

	queueQuery(id) {
		if (!this.queryQueue.includes(id)) {
			this.queryQueue.push(id)
		}
	}

	async init(config) {
		this.hasError = false
		this.config = config

		this.init_actions()
		this.init_variables()
		this.init_feedbacks()
		this.init_presets()
		this.init_tcp()
	}

	async configUpdated(config) {
		const resetConnection = this.config.host != config.host || this.config.port != config.port

		this.config = config

		if (resetConnection === true || this.socket === undefined) {
			this.init_variables()
			this.init_tcp()
		}
	}

	// When module gets deleted
	async destroy() {
		this.stopHeartbeat()
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}
	}

	init_actions() {
		this.setActionDefinitions(compileActionDefinitions(this))
	}

	init_feedbacks() {
		this.setFeedbackDefinitions(compileFeedbackDefinitions(this))
	}

	init_variables() {
		this.vStat = {}
		this.rawStat = {}
		this.setVariableDefinitions(compileVariableDefinitions(this))
		this.setVariableValues({ transport: TRANSPORT_LABELS[this.transState] })
	}

	stopHeartbeat() {
		if (this.heartbeat) {
			clearInterval(this.heartbeat)
			delete this.heartbeat
		}
	}

	/**
	 * Called every PULSE_MS: sends at most one query so the recorder isn't flooded
	 */
	pulse() {
		const now = Date.now()

		if (this.needStats) {
			this.pollStats()
			return
		}

		// connections created before this option existed won't have it set
		const interval = Number(this.config.poll_interval ?? DEFAULT_POLL_MS) || 0
		if (interval > 0 && now - this.lastLivePoll >= Math.max(interval, MIN_POLL_MS)) {
			this.lastLivePoll = now
			if (this.powerOn) {
				TRANSPORT_STATUS.forEach((id) => this.queueQuery(id))
				if (this.config.poll_track) {
					TRACK_STATUS.forEach((id) => this.queueQuery(id))
				}
			}
		}

		if (now - this.lastKeepalive >= KEEPALIVE_MS) {
			this.lastKeepalive = now
			this.queueQuery('PW')
		}

		if (this.queryQueue.length) {
			this.sendCommand('?' + this.queryQueue.shift())
		}
	}

	/**
	 * Initial load of every status value the recorder will answer
	 */
	pollStats() {
		let stillNeed = 0
		let counter = 0
		const timeNow = Date.now()
		const timeOut = timeNow - this.POLL_TIMEOUT

		for (const id in this.vStat) {
			if (!this.vStat[id].valid) {
				stillNeed++
				if (this.vStat[id].polled < timeOut) {
					this.sendCommand(`?${id}`)
					this.vStat[id].polled = timeNow
					counter++
					// only allow 'POLL_COUNT' queries during one cycle
					if (counter > this.POLL_COUNT) {
						break
					}
				}
			}
		}

		if (this.needStats && 0 == stillNeed) {
			this.updateStatus(InstanceStatus.Ok, 'Recorder status loaded')
			const c = Object.keys(this.vStat).length
			const d = (c / ((timeNow - this.timeStart) / 1000)).toFixed(1)
			this.log('info', `Status Sync complete (${c}@${d}/s)`)
			this.needStats = false
		}
	}

	firstPoll() {
		this.needStats = true
		this.queryQueue = []
		this.timeStart = Date.now()
		this.lastLivePoll = this.timeStart
		this.lastKeepalive = this.timeStart
		for (const id in this.vStat) {
			this.vStat[id].polled = 0
		}
		this.pollStats()
	}

	init_tcp() {
		if (this.socket !== undefined) {
			this.socket.destroy()
			delete this.socket
		}

		this.stopHeartbeat()

		if (!this.config.host || !this.config.port) {
			this.updateStatus(InstanceStatus.BadConfig, 'Missing host or port')
			return
		}

		this.updateStatus(InstanceStatus.Connecting, 'Connecting')

		this.socket = new TCPHelper(this.config.host, this.config.port)

		this.socket.on('end', () => {
			this.updateStatus(InstanceStatus.Disconnected, 'Closed')
			this.log('info', 'Connection Closed')
			this.stopHeartbeat()
			this.hasError = true
		})

		this.socket.on('error', (err) => {
			this.stopHeartbeat()
			if (!this.hasError) {
				this.updateStatus(InstanceStatus.ConnectionFailure, err.message)
				this.log('error', 'Network error: ' + err.message)
				this.hasError = true
			}
		})

		this.socket.on('connect', () => {
			this.updateStatus(InstanceStatus.Connecting, 'Loading Recorder status')
			this.hasError = false
			this.stopHeartbeat()
			this.firstPoll()
			this.heartbeat = setInterval(() => this.pulse(), PULSE_MS)
		})

		const parse = createLineParser((line, acked) => {
			if (this.devMode) {
				this.log('debug', `Received ${acked ? 'reply' : 'auto-status'} '${line}'`)
			}
			// no ack means status update from unit, respond with ACK
			if (!acked) {
				this.socket.send(String.fromCharCode(ACK))
			}
			this.processReply(line)
		})

		this.socket.on('data', parse)
	}

	processReply(resp) {
		const stat = parseStatus(resp)

		if (stat) {
			if (this.vStat[stat.key]) {
				this.vStat[stat.key].valid = true
			}
			this.rawStat[stat.key] = stat.raw

			const update = { [stat.varId]: stat.value }
			if (stat.formatted !== undefined) {
				update[stat.varId + '_fmt'] = stat.formatted
			}
			this.setVariableValues(update)

			if (stat.cmd == 'MM') {
				this.checkFeedbacks('media')
			} else if (stat.cmd == 'IN') {
				this.checkFeedbacks('rec_input')
			}
		}

		let trans = ''
		switch (resp) {
			case 'PW00':
			case 'PW01':
			case 'PW02':
				this.powerOn = 'PW00' == resp
				this.checkFeedbacks('power')
				if (this.powerOn) {
					this.queueQuery('ST')
				} else {
					trans = 'STOF'
				}
				break
			case 'STAB':
				trans = 'STPL'
				break
			case 'STPR':
				trans = 'STPP'
				break
			case 'STCE':
				trans = 'STOF'
				break
			case 'STRE':
			case 'STRP':
			case 'STPL':
			case 'STPP':
			case 'STST':
				trans = resp
				break
		}
		if (trans != '' && trans != this.transState) {
			this.transState = trans
			this.setVariableValues({ transport: TRANSPORT_LABELS[trans] })
			this.checkFeedbacks('transport')
		}
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 6,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target Port (Default: 23)',
				width: 3,
				default: '23',
				regex: Regex.PORT,
			},
			{
				type: 'number',
				id: 'poll_interval',
				label: 'Transport poll interval in ms (0 to disable)',
				tooltip: 'How often the transport state is re-read from the recorder (minimum 500 ms)',
				width: 4,
				min: 0,
				max: 60000,
				default: DEFAULT_POLL_MS,
			},
			{
				type: 'checkbox',
				id: 'poll_track',
				label: 'Also poll track and time values',
				tooltip:
					'Refresh track number, elapsed/remaining time and remaining record time on each poll (sends 7 extra queries per poll)',
				width: 4,
				default: false,
			},
		]
	}

	init_presets() {
		const presets = {}
		const white = combineRgb(255, 255, 255)
		const black = combineRgb(0, 0, 0)

		const button = (category, label, actionId, cmd, feedbacks = []) => ({
			type: 'button',
			category,
			name: label,
			style: {
				text: label,
				size: '14',
				color: white,
				bgcolor: black,
			},
			steps: [
				{
					down: [{ actionId, options: { sel_cmd: cmd } }],
					up: [],
				},
			],
			feedbacks,
		})

		const transportFb = (type, bgcolor) => [
			{ feedbackId: 'transport', options: { type }, style: { color: white, bgcolor } },
		]

		// which transport state lights each preset
		const LIT = {
			'23PW': [
				{ feedbackId: 'power', options: { state: '1' }, style: { color: white, bgcolor: combineRgb(0, 153, 0) } },
			],
			2312: [{ feedbackId: 'power', options: { state: '0' }, style: { color: white, bgcolor: combineRgb(153, 0, 0) } }],
			2355: transportFb('STRE', combineRgb(204, 0, 0)),
			'23Rp': transportFb('STRP', combineRgb(204, 102, 0)),
			2353: transportFb('STPL', combineRgb(0, 153, 0)),
			2348: transportFb('STPP', combineRgb(204, 153, 0)),
			2354: transportFb('STST', combineRgb(80, 80, 80)),
		}

		const groups = [
			['System', 'power', CHOICES.POWER],
			['Recording', 'record', CHOICES.RECORD_ACTIONS],
			['Track/Title', 'track_playback', CHOICES.TRACK_PLAYBACK],
			['Track/Title', 'track_selection', CHOICES.TRACK_SELECTION.filter((c) => c.id != 'Tr')],
			['Media', 'media_select', CHOICES.MEDIA_SELECT],
			['Recording Setup', 'record_input', CHOICES.RECORD_INPUT],
			['Recording Setup', 'record_monitor', CHOICES.RECORD_MONITOR],
			['Recording Setup', 'record_format', CHOICES.RECORD_FORMAT],
			['System', 'panel_lock', CHOICES.PANEL_LOCK],
		]

		for (const [category, actionId, choices] of groups) {
			for (const c of choices) {
				let feedbacks = LIT[c.id] || []
				if (actionId == 'media_select') {
					feedbacks = [
						{
							feedbackId: 'media',
							options: { media: c.id.slice(2) },
							style: { color: white, bgcolor: combineRgb(0, 0, 153) },
						},
					]
				} else if (actionId == 'record_input' && c.id.startsWith('IN')) {
					feedbacks = [
						{
							feedbackId: 'rec_input',
							options: { input: c.id.slice(2) },
							style: { color: white, bgcolor: combineRgb(0, 0, 153) },
						},
					]
				}
				presets[`${actionId}_${c.id}`] = button(category, c.label, actionId, c.id, feedbacks)
			}
		}

		const status = (name, text) => ({
			type: 'button',
			category: 'Status',
			name,
			style: { text, size: '14', color: white, bgcolor: black },
			steps: [{ down: [], up: [] }],
			feedbacks: [],
		})
		presets.status_transport = status('Transport State', `$(${this.label}:transport)`)
		presets.status_track = status('Current Track', `Track\n$(${this.label}:track_cur)/$(${this.label}:track_tot)`)
		presets.status_elapsed = status('Track Elapsed', `Elapsed\n$(${this.label}:track_et_fmt)`)
		presets.status_remain = status('Track Remaining', `Remain\n$(${this.label}:track_rt_fmt)`)
		presets.status_rec_remain = status('Record Time Remaining', `Rec left\n$(${this.label}:rec_remain)`)
		presets.status_media = status('Selected Media', `Media\n$(${this.label}:media)`)

		this.setPresetDefinitions(presets)
	}
}

runEntrypoint(DNRInstance, UpgradeScripts)
