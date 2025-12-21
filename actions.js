import { Regex } from '@companion-module/base'
import * as CHOICES from './choices.js'

export function compileActionDefinitions(self) {
	function pad0(num, len = 2) {
		return ('0'.repeat(len) + num).slice(-len)
	}

	return {
		power: {
			name: 'Power',
			options: [
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: CHOICES.POWER[0].id,
					choices: CHOICES.POWER,
				},
			],
			callback: async (action, context) => {
				await self.sendCommand(action.options.sel_cmd, true)
			},
		},
		record: {
			name: 'Record Functions',
			options: [
				{
					type: 'static-text',
					id: 'info',
					label: 'Recording Control',
					width: 12,
				},
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Command',
					default: '2353',
					choices: CHOICES.RECORD_ACTIONS,
				},
			],
			callback: async (action, context) => {
				await self.sendCommand(action.options.sel_cmd)
			},
		},
		track_playback: {
			name: 'Track Playback',
			options: [
				{
					type: 'static-text',
					id: 'info',
					label: 'Information',
					width: 12,
					value: 'Track Playback Control.',
				},
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: '2353',
					choices: CHOICES.TRACK_PLAYBACK,
				},
			],
			callback: async (action, context) => {
				await self.sendCommand(action.options.sel_cmd)
			},
		},
		track_selection: {
			name: 'Track Selection',
			options: [
				{
					type: 'static-text',
					id: 'info',
					label: 'Information',
					width: 12,
					value: 'Select Track',
				},
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
					required: false,
					range: false,
					regex: Regex.NUMBER,
				},
			],
			callback: async (action, context) => {
				let cmd = action.options.sel_cmd
				if (action.options.sel_cmd == 'Tr') {
					cmd += pad0(action.options.sel_val, 4)
				}
				await self.sendCommand(cmd)
			},
		},
		panel_lock: {
			name: 'Panel Lock/Unlock',
			options: [
				{
					type: 'dropdown',
					id: 'sel_cmd',
					label: 'Option',
					default: CHOICES.PANEL_LOCK[0].id,
					choices: CHOICES.PANEL_LOCK,
				},
			],
			callback: async (action, context) => {
				await self.sendCommand(action.options.sel_cmd)
			},
		},
		format: {
			name: 'Format Current Media Source',
			options: [
				{
					type: 'text',
					id: 'info',
					label: 'Warning!',
					width: 12,
					value: 'This will ERASE the currently selected\nRecord Media!! ',
				},
			],
			callback: async (action, context) => {
				await self.sendCommand('23FOMAT')
			},
		},
		custom: {
			name: 'Custom command',
			options: [
				{
					type: 'textinput',
					id: 'cmd',
					label: 'Command',
					default: '',
				},
			],
			callback: async (action, context) => {
				await self.sendCommand(action.options.cmd)
			},
		},
	}
}
