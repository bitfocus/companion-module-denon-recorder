import { STATUS } from './responses.js'

export function compileVariableDefinitions(self) {
	let vars = []

	for (let resp in STATUS) {
		if (STATUS[resp].hasLR) {
			;[
				['l', 'Left'],
				['r', 'Right'],
			].forEach((lr) => {
				self.vStat[resp + lr[0].toUpperCase()] = {
					valid: !STATUS[resp]?.isRequest,
					polled: 0,
				}
				vars.push({ variableId: STATUS[resp].varName + '_' + lr[0], name: STATUS[resp].varDesc + ' ' + lr[1] })
			})
		} else {
			self.vStat[resp] = {
				valid: !STATUS[resp]?.isRequest,
				polled: 0,
			}
			if (Object.keys(STATUS[resp].opt).length) {
				vars.push({ variableId: STATUS[resp].varName, name: STATUS[resp].varDesc })
			}
		}
	}
	return vars
}
