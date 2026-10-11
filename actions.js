import * as CHOICES from './choices.js'

export function compileActionDefinitions(self) {
	function pad0(num, len = 2) {
		return ('0'.repeat(len) + num).slice(-len)
	}

	// simple 'pick a command from a list' action
	function listAction(name, choices, refresh = []) {
		return {
			name,
			options: [
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Command',
					default: choices[0].id,
					choices,
				},
			],
			callback: async (action) => {
				await self.sendCommand(action.options.sel_cmd, refresh)
			},
		}
	}

	return {
		power: listAction('Power', CHOICES.POWER, ['PW', 'ST']),
		record: listAction('Record Functions', CHOICES.RECORD_ACTIONS, ['ST', 'OR']),
		track_playback: listAction('Track Playback', CHOICES.TRACK_PLAYBACK, ['ST']),
		track_selection: {
			name: 'Track Selection',
			options: [
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: '2333',
					choices: CHOICES.TRACK_SELECTION,
				},
				{
					type: 'number',
					id: 'sel_val',
					label: 'Track Number (1-2000)',
					min: 1,
					max: 2000,
					default: 1,
					isVisible: (options) => options.sel_cmd == 'Tr',
				},
			],
			callback: async (action) => {
				let cmd = action.options.sel_cmd
				if (cmd == 'Tr') {
					cmd += pad0(action.options.sel_val, 4)
				}
				await self.sendCommand(cmd, ['Tr', 'ST'])
			},
		},
		media_select: listAction('Media Selection', CHOICES.MEDIA_SELECT, ['MM', 'Tr', 'Tt']),
		record_input: listAction('Record Input / Channels', CHOICES.RECORD_INPUT, ['IN', 'CH']),
		record_monitor: listAction('Record Monitor / Input Volume', CHOICES.RECORD_MONITOR, ['Rm', 'VI', 'RV']),
		record_format: listAction('Recording Format', CHOICES.RECORD_FORMAT, ['AF']),
		panel_lock: listAction('Panel Lock/Unlock', CHOICES.PANEL_LOCK),
		format: {
			name: 'Format Current Media Source',
			options: [
				{
					type: 'static-text',
					id: 'info',
					label: 'Warning!',
					width: 12,
					value: 'This will ERASE the currently selected Record Media!!',
				},
			],
			callback: async () => {
				await self.sendCommand('23FOMAT')
			},
		},
		custom: {
			name: 'Custom command',
			options: [
				{
					type: 'textinput',
					id: 'cmd',
					label: 'Command (without the @0 prefix)',
					default: '',
				},
			],
			callback: async (action) => {
				await self.sendCommand(action.options.cmd)
			},
		},
	}
}
