import { Regex } from '@companion-module/base'
import * as CHOICES from './choices.js'

export function compileFeedbackDefinitions(self) {
	//init_feedbacks() {
	const actionDefs = {
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
				return context.powerOn == ('1' == feedback.options.state)
			},
		},
	}
	return actionDefs
}
