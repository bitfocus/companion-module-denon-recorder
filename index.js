/* eslint-disable no-useless-escape */
import { combineRgb, Regex, TCPHelper } from '@companion-module/base'
import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { compileVariableDefinitions } from './variables.js'
import { compileFeedbackDefinitions } from './feedback.js'
import { STATUS } from './responses.js'
import { UpgradeScripts } from './upgrades.js'

import * as CHOICES from './choices.js'

class DNRInstance extends InstanceBase {
	constructor(internal) {
		// super-constructor
		super(internal)

		this.devMode = process.env.DEVELOPER

		this.powerOn = false
		this.transState = this.TRANS_OFF
		this.ACK = 6
		this.NAK = 15
		this.POLL_COUNT = 1
		this.POLL_TIMEOUT = 1000

		this.waiting = false
		this.needStats = true
	}

	async sendCommand(cmd, req = false) {
		if (this.devMode && !this.needStats) {
			console.log('Send: @0' + cmd)
			this.log('debug', `sending '@0${cmd}' to ${this.config.host}`)
		}

		if (this.socket !== undefined && this.socket.isConnected) {
			this.socket.send('@0' + cmd + '\r')
			// request info if command not issue a response
			if (req && !this.needStats) {
				this.pulse()
			}
		} else {
			this.log('error', 'Not connected :(')
		}
	}

	async init(config) {
		this.hasError = false
		this.config = config

		this.init_actions() // export actions
		this.init_presets()
		this.init_variables()
		//this.init_feedbacks()
		this.init_tcp()
	}

	async configUpdated(config) {
		let resetConnection = this.config.host != config.host || this.config.port != config.port

		this.config = config

		this.init_actions() // export actions
		this.init_presets()
		this.init_variables()
		//this.init_feedbacks()

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp()
		}
	}

	// When module gets deleted
	async destroy() {
		if (this.socket !== undefined) {
			if (this.socket.isConnected) {
				this.socket.end()
			}

			this.socket.destroy()
		}
		if (this.heartbeat) {
			clearInterval(this.heartbeat)
			delete this.heartbeat
		}
	}

	init_actions() {
		this.setActionDefinitions(compileActionDefinitions(this))
	}

	init_variables() {
		this.vStat = {}
		this.setVariableDefinitions(compileVariableDefinitions(this))
	}

	/**
	 * heartbeat to request updates, device gets bored after 5 minutes
	 */
	pulse() {
		this.pollCount++
		// any leftover status needed?
		if (this.needStats) {
			this.pollStats()
		} else if (this.pollCount % 200 == 0) {
			this.sendCommand('?PW')
		}
	}

	pollStats() {
		let stillNeed = 0
		let counter = 0
		let timeNow = Date.now()
		let timeOut = timeNow - this.POLL_TIMEOUT

		for (const id in this.vStat) {
			if (!this.vStat[id].valid) {
				stillNeed++
				if (this.vStat[id].polled < timeOut) {
					this.sendCommand(`?${id}`, true)
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
			this.log('info', `Status Sync complete (${c}@${d})`)
			this.needStats = false
		}
	}

	firstPoll() {
		this.needStats = true
		this.pollCount = 0
		this.timeStart = Date.now()
		this.pollStats()
		this.pulse()
	}

	init_tcp() {
		let self = this

		if (this.socket !== undefined) {
			if (this.socket.isConnected) {
				this.socket.end()
			}
			this.socket.destroy()
			delete this.socket
		}

		if (this.heartbeat) {
			clearInterval(this.heartbeat)
			delete this.heartbeat
		}

		this.updateStatus(InstanceStatus.Connecting, 'Connecting')

		if (this.config.host && this.config.port) {
			this.socket = new TCPHelper(this.config.host, this.config.port)
			this.connected = false

			this.socket.on('end', () => {
				this.updateStatus(InstanceStatus.Disconnected, 'Closed')
				this.log('info', 'Connection Closed')
				if (this.heartbeat) {
					clearInterval(this.heartbeat)
					delete this.heartbeat
				}
				this.hasError = true
				this.connected = false
			})

			this.socket.on('error', (err) => {
				if (this.heartbeat) {
					clearInterval(this.heartbeat)
					delete this.heartbeat
				}
				if (!this.hasError) {
					this.log('debug', `Network error ${err}`)
					this.updateStatus(InstanceStatus.UnknownError, err.message)
					this.log('error', 'Network error: ' + err.message)
					this.hasError = true
				}
			})

			this.socket.on('connect', () => {
				this.updateStatus(InstanceStatus.Connecting, 'Loading Recorder status')

				this.firstPoll()
				this.heartbeat = setInterval(() => {
					this.pulse()
				}, 25)
				this.hasError = false
			})

			this.socket.on('data', (chunk) => {
				let ackAt = 0
				let ackStat = 0

				if (!this.connected) {
					this.connected = true
					this.log('debug', 'Connecting')
					this.updateStatus(InstanceStatus.Connecting, 'Loading device data')
				}

				while (ackAt < chunk.byteLength && [this.ACK, this.NAK].includes(chunk.readInt8(ackAt))) {
					ackAt++
				}
				switch (chunk.readInt8(0)) {
					case this.ACK:
						ackStat = 1
						break
					case this.NAK:
						ackStat = 2
						break
					default:
						ackStat = 0
				}

				let resp = chunk.toString(undefined, ackAt + 2).slice(0, -1)
				let isPower = false

				if (this.devMode && !this.needStats) {
					this.log('debug', `Received ${chunk.length} bytes of data. ${chunk}`)
					// response or auto-status?
					if (ackStat > 0) {
						this.log('debug', `Response ${ackStat == 1 ? 'ACK' : 'NAK'}`)
					} else {
						this.log('debug', 'Auto-stat')
					}
					// status request response
					this.log('debug', "Data is: '" + resp + "'") /*  */

					console.log('Received ' + chunk.length + ' bytes of data.', chunk.toString())
					if (ackStat > 0) {
						console.log(`Starts with ${ackStat == 1 ? 'ACK' : 'NAK'}`)
					} else {
						console.log('Auto-stat')
					}
				}

				if (resp != '') {
					this.processReply(resp)
				}

				// no ack means status update from unit, respond with ACK
				if (!ackStat) {
					this.socket.send(String.fromCharCode(this.ACK))
				}
			})
		}
	}

	processReply(resp) {
		let cmd = resp.slice(0, 2)
		let subLen = STATUS[cmd]?.subLen || 0
		const lr = STATUS[cmd]?.hasLR ? 3 : 2
		let val = subLen == 0 ? resp.slice(lr) : resp.slice(lr, lr + subLen)
		let vName = STATUS[cmd]?.varName
		const subVal = subLen == 0 ? '' : resp.slice(lr + subLen)
		const vDesc = STATUS[cmd]?.opt[val]?.desc || val
		const vPlus = STATUS[cmd]?.opt[val]?.sub[subVal] || ''
		let isPower = false

		if (STATUS[cmd] != undefined) {
			let varUpdate = []

			if (STATUS[cmd].hasLR) {
				cmd = resp.slice(0, 3)
				val = resp.slice(3)
				vName = vName + '_' + cmd.slice(-1).toLowerCase()
			}
			this.vStat[cmd].valid = true
			// if (subLen > 0) {
			// 	val = vDesc
			// }

			varUpdate[vName] = vDesc + subVal || ''

			this.setVariableValues(varUpdate)
		}

		switch (cmd) {
		}
		switch (resp) {
			case 'PW00':
			case 'PW01':
			case 'PW02':
				this.powerOn = 'PW00' == resp
				if (this.powerOn) {
					isPower = true
					this.sendCommand('?ST')
				} else {
					resp = 'STOF'
				}
				this.checkFeedbacks('power')
				break
			case 'STAB':
				resp = 'STPL'
				break
			case 'STPR':
				resp = 'STPP'
				break
			case 'STCE':
				resp = 'STOF'
				break
			case 'STRE':
			case 'STRP':
			case 'STPL':
			case 'STPP':
			case 'STST':
				break
			default: // something we don't track
				resp = ''
		}
		if (!isPower && '' != resp) {
			this.transState = resp
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
				default: 23,
				regex: Regex.PORT,
			},
		]
	}

	init_presets() {
		const presets = {}
		const pstSize = '14'

		for (let input in CHOICES.POWER) {
			presets[`power_${input}`] = {
				type: 'button',
				category: 'System',
				name: CHOICES.POWER[input].label,
				style: {
					text: CHOICES.POWER[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: 0,
				},
				steps: [
					{
						down: [
							{
								actionId: 'power',
								options: {
									sel_cmd: CHOICES.POWER[input].id,
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [],
			}
		}

		for (let input in CHOICES.RECORD_ACTIONS) {
			presets[`rec_${input}`] = {
				type: 'button',
				category: 'Recording',
				name: CHOICES.RECORD_ACTIONS[input].label,
				style: {
					text: CHOICES.RECORD_ACTIONS[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: 0,
				},
				steps: [
					{
						down: [
							{
								actionId: 'record',
								options: {
									sel_cmd: CHOICES.RECORD_ACTIONS[input].id,
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [],
			}
		}

		for (let input in CHOICES.TRACK_PLAYBACK) {
			presets[`pb_${input}`] = {
				type: 'button',
				category: 'Track/Title',
				name: CHOICES.TRACK_PLAYBACK[input].label,
				style: {
					text: CHOICES.TRACK_PLAYBACK[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: 'track_playback',
								options: {
									sel_cmd: CHOICES.TRACK_PLAYBACK[input].id,
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [],
			}
		}

		for (let input in CHOICES.TRACK_SELECTION) {
			presets[`sel_${input}`] = {
				type: 'button',
				category: 'Track/Title',
				name: CHOICES.TRACK_SELECTION[input].label,
				style: {
					text: CHOICES.TRACK_SELECTION[input].label,
					size: pstSize,
					color: '16777215',
					bgcolor: 0,
				},
				steps: [
					{
						down: [
							{
								actionId: 'track_selection',
								options: {
									sel_cmd: CHOICES.TRACK_SELECTION[input].id,
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [],
			}
		}

		for (let input in CHOICES.PANEL_LOCK) {
			presets[`panel_${input}`] = {
				type: 'button',
				category: 'System',
				name: CHOICES.PANEL_LOCK[input].label,
				style: {
					text: CHOICES.PANEL_LOCK[input].label,
					size: 14,
					color: '16777215',
					bgcolor: combineRgb(0, 0, 0),
				},
				steps: [
					{
						down: [
							{
								actionId: 'panel_lock',
								options: {
									sel_cmd: CHOICES.PANEL_LOCK[input].id,
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [],
			}
		}

		this.setPresetDefinitions(presets)
	}
}

runEntrypoint(DNRInstance, UpgradeScripts)
