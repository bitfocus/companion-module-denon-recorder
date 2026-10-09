import { CreateConvertToBooleanFeedbackUpgradeScript } from '@companion-module/base'

export const UpgradeScripts = [
	CreateConvertToBooleanFeedbackUpgradeScript({
		power: true,
	}),
	CreateConvertToBooleanFeedbackUpgradeScript({
		transport: {
			fg: 'color',
			bg: 'bgcolor',
		},
	}),
]
