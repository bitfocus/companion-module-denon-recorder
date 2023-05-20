/* eslint-disable no-useless-escape */
import { combineRgb, Regex, TCPHelper } from '@companion-module/base'
import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { compileActionDefinitions } from './actions.js'
import { UpgradeScripts } from './upgrades.js'

import * as CHOICES from './choices.js'

class DNRInstance extends InstanceBase {
	constructor(internal) {
		// super-constructor
		super(internal)

		this.devMode = process.env.DEVELOPER

		this.powerOn = false
		this.transState = this.TRANS_OFF
	}

	async init(config) {
		this.hasError = false
		this.config = config

		this.init_actions() // export actions
		this.init_presets()
		this.init_feedbacks()
		this.init_tcp()
	}

	async configUpdated(config) {
		let resetConnection = this.config.host != config.host || this.config.port != config.port

		this.config = config

		this.init_presets()

		if (resetConnection === true || this.socket === undefined) {
			this.init_tcp()
		}
	}

	// When module gets deleted
	async destroy() {
		if (this.socket !== undefined) {
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

	/**
	 * heartbeat to request updates, device gets bored after 5 minutes
	 */
	pulse() {
		this.socket.send('@0?PW\r')
	}

	init_tcp() {
		let self = this

		if (this.socket !== undefined) {
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

			this.socket.on('end', function () {
				self.updateStatus(InstanceStatus.Disconnected, 'Closed')
				self.log('info', 'Connection Closed')
				if (self.heartbeat) {
					clearInterval(self.heartbeat)
					delete self.heartbeat
				}
				self.hasError = true
			})

			this.socket.on('error', function (err) {
				if (this.heartbeat) {
					clearInterval(self.heartbeat)
					delete self.heartbeat
				}
				if (!self.hasError) {
					self.log('debug', `Network error ${err}`)
					self.updateStatus(InstanceStatus.UnknownError, err.message)
					self.log('error', 'Network error: ' + err.message)
					self.hasError = true
				}
			})

			this.socket.on('connect', function () {
				self.updateStatus(InstanceStatus.Ok)
				self.heartbeat = setInterval(function () {
					self.pulse()
				}, 60000)
				self.hasError = false
				self.log('debug', 'Connected')
				if (self.devMode) {
					console.log('Sending @0?PW')
				}
				self.socket.send('@0?PW\r')
			})

			this.socket.on('data', function (chunk) {
				let ack = 0
				while (ack < chunk.byteLength && chunk.readInt8(ack) == 6) {
					ack++
				}
				let resp = chunk.toString(undefined, ack+2).slice(0, -1)
				let isPower = false

				if (self.devMode) {
					self.log('debug', `Received ${chunk.length} bytes of data. ${chunk}`)
					// response or auto-status?
					self.log('debug', 'Starts with ACK: ', ack)
					// status request response
					self.log('debug', "Response is: '" + resp + "'")

					console.log('Received ' + chunk.length + ' bytes of data.', chunk)
					console.log('Starts with ACK: ', ack)
					console.log("Response is: '" + resp + "'")
				}
				switch (resp) {
					case 'PW00':
					case 'PW01':
					case 'PW02':
						self.powerOn = 'PW00' == resp
						if (self.powerOn) {
							isPower = true
							if (self.devMode) {
								console.log('Sending @0?ST')
							}
							self.socket.send('@0?ST\r')
						} else {
							resp = 'STOF'
						}
						self.checkFeedbacks('power')
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
					self.transState = resp
					self.checkFeedbacks('transport')
				}
				// no ack means status update from unit, respond with ACK
				if (!ack) {
					self.socket.send(String.fromCharCode(6))
				}
			})
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

	init_feedbacks() {
		let self = this
		this.setFeedbackDefinitions({
			transport: {
				type: 'advanced',
				name: 'Color for Transport Mode',
				description: 'Set Button colors for Off, Play, Pause,\nRec Pause, Recording',
				options: [
					{
						type: 'colorpicker',
						label: 'Foreground color',
						id: 'fg',
						default: '16777215',
					},
					{
						type: 'colorpicker',
						label: 'Background color',
						id: 'bg',
						default: combineRgb(32, 32, 32),
					},
					{
						type: 'dropdown',
						label: 'Which Mode?',
						id: 'type',
						default: 'STOF',
						choices: CHOICES.TRANSPORT,
					},
				],
				callback: function (feedback, context) {
					let ret = {}
					let options = feedback.options
					let type = options.type

					if (type == self.transState) {
						ret = { color: options.fg, bgcolor: options.bg }
					}
					return ret
				},
			},
			power: {
				type: 'boolean',
				name: 'Power Status',
				description: 'Indicate Power State on Button',
				defaultStyle: {
					bgcolor: combineRgb(32, 32, 32),
					color: combineRgb(255, 255, 255),
				},
				options: [
					{
						type: 'dropdown',
						label: 'Status?',
						id: 'state',
						default: '1',
						choices: [
							{ id: '0', label: 'Off' },
							{ id: '1', label: 'On' },
						],
					},
				],
				callback: function (feedback, context) {
					return self.powerOn == ('1' == feedback.options.state)
				},
			},
		})
	}
}

runEntrypoint(DNRInstance, UpgradeScripts)
