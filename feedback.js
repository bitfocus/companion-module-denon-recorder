import { combineRgb } from '@companion-module/base'
import { STATUS } from './responses.js'
import * as CHOICES from './choices.js'

function optChoices(cmd) {
	return Object.entries(STATUS[cmd].opt).map(([id, opt]) => ({ id, label: opt.desc }))
}

export function compileFeedbackDefinitions(self) {
	return {
		transport: {
			type: 'boolean',
			name: 'Transport State',
			description: 'Change button style when the transport is in the selected state',
			defaultStyle: {
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 153, 0),
			},
			options: [
				{
					type: 'dropdown',
					label: 'State',
					id: 'type',
					default: 'STOF',
					choices: CHOICES.TRANSPORT,
				},
			],
			callback: (feedback) => feedback.options.type == self.transState,
		},
		power: {
			type: 'boolean',
			name: 'Power Status',
			description: 'Indicate Power State on Button',
			defaultStyle: {
				bgcolor: combineRgb(0, 153, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Status',
					id: 'state',
					default: '1',
					choices: [
						{ id: '0', label: 'Off' },
						{ id: '1', label: 'On' },
					],
				},
			],
			callback: (feedback) => self.powerOn == ('1' == feedback.options.state),
		},
		media: {
			type: 'boolean',
			name: 'Selected Media',
			description: 'Change button style when the selected media matches',
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 153),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Media',
					id: 'media',
					default: 'S1',
					choices: optChoices('MM'),
				},
			],
			callback: (feedback) => self.rawStat.MM == feedback.options.media,
		},
		rec_input: {
			type: 'boolean',
			name: 'Recording Input',
			description: 'Change button style when the recording input matches',
			defaultStyle: {
				bgcolor: combineRgb(0, 0, 153),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					default: 'BA',
					choices: optChoices('IN'),
				},
			],
			callback: (feedback) => self.rawStat.IN == feedback.options.input,
		},
	}
}
