import { STATUS } from './responses.js'

export function compileVariableDefinitions(self) {
	const vars = [{ variableId: 'transport', name: 'Transport State' }]

	for (const resp in STATUS) {
		const def = STATUS[resp]
		const keys = def.hasLR
			? [
					[resp + 'L', '_l', ' Left'],
					[resp + 'R', '_r', ' Right'],
				]
			: [[resp, '', '']]

		for (const [key, idSuffix, nameSuffix] of keys) {
			self.vStat[key] = {
				valid: !def.isRequest,
				polled: 0,
			}
			vars.push({ variableId: def.varName + idSuffix, name: def.varDesc + nameSuffix })
			if (def.format) {
				vars.push({ variableId: def.varName + idSuffix + '_fmt', name: def.varDesc + nameSuffix + ' (formatted)' })
			}
		}
	}
	return vars
}
